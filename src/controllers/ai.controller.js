import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "../models/index.js";
import { Op } from "sequelize";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const { Route, Trip, Sequelize } = db;

// helper: bỏ ```json ... ```
function stripCodeFence(text = "") {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();
  }
  return t;
}

// helper: AI bóc tách ga đi, ga đến, ngày đi từ message
async function extractTravelInfo(message, stationNames = []) {
  const extractPrompt = `
Người dùng nhắn: "${message}"

Hãy trích xuất thông tin chuyến đi (nếu có) thành JSON với cấu trúc:
{
  "origin": "tên ga đi hoặc null",
  "destination": "tên ga đến hoặc null",
  "date": "YYYY-MM-DD hoặc null",
  "missing": ["origin", "destination", "date"]
}

- "missing" là mảng các field còn thiếu thông tin.
- Nếu không chắc về ngày thì để "date": null.
- Danh sách tên ga hợp lệ trong hệ thống: ${stationNames.join(", ")}.
- Nếu người dùng dùng từ tương đương (ví dụ: "SG", "Sài Gòn", "tp.hcm") thì cố map về đúng 1 trong các tên ga trên.
- Không được trả gì ngoài JSON hợp lệ.
`.trim();

  const result = await model.generateContent(extractPrompt);
  let text = stripCodeFence(result.response.text() || "");
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("extractTravelInfo JSON parse failed:", text);
    return { origin: null, destination: null, date: null, missing: [] };
  }
}

export const chatWithAI = async (req, res) => {
  try {
    let { message, origin, destination, date, route_id } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "message is required" });
    }

    // ================== 1. Nếu thiếu origin/destination/date thì nhờ AI bóc tách ==================
    if (!origin || !destination || !date) {
      const routesAll = await Route.findAll({
        attributes: ["origin", "destination"],
      });

      const stationSet = new Set();
      routesAll.forEach((r) => {
        stationSet.add(r.origin);
        stationSet.add(r.destination);
      });
      const stationNames = Array.from(stationSet);

      const extracted = await extractTravelInfo(message, stationNames);

      origin = origin || extracted.origin || null;
      destination = destination || extracted.destination || null;
      date = date || extracted.date || null;
    }

    // ================== 2. Lấy danh sách route phù hợp ==================
    let routes = [];

    if (route_id) {
      const r = await Route.findByPk(route_id);
      if (r) routes = [r];
    } else if (origin && destination) {
      const originTrim = String(origin).trim();
      const destTrim = String(destination).trim();

      routes = await Route.findAll({
        where: {
          origin: { [Op.like]: `%${originTrim}%` },
          destination: { [Op.like]: `%${destTrim}%` },
        },
        order: [["id", "ASC"]],
      });

      if (routes.length === 0) {
        routes = await Route.findAll({
          where: {
            origin: originTrim,
            destination: destTrim,
          },
          order: [["id", "ASC"]],
        });
      }
    }

    const primaryRoute = routes[0] || null;
    const routeIds = routes.map((r) => r.id);

    // ================== 3. Tìm trips theo nhiều route + date ==================
    let trips = [];
    if (routeIds.length > 0 && date) {
      trips = await Trip.findAll({
        where: {
          route_id: { [Op.in]: routeIds },
          status: "scheduled", // chỉnh nếu ông dùng status khác
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn("DATE", Sequelize.col("departure_time")),
              date
            ),
          ],
        },
        include: [
          {
            model: Route,
            as: "route",
            attributes: [
              "id",
              "origin",
              "destination",
              "distance_km",
              "eta_minutes",
            ],
          },
        ],
        order: [["departure_time", "ASC"]],
      });
    }

    console.log("AI DEBUG:", {
      body: { message, origin, destination, date, route_id },
      routeIds,
      tripsCount: trips.length,
    });

    // ================== 4. Build context text ==================
    const routeText = primaryRoute
      ? `Một trong các tuyến phù hợp: ${primaryRoute.origin} → ${primaryRoute.destination}, khoảng cách ${primaryRoute.distance_km} km, thời gian dự kiến ${primaryRoute.eta_minutes} phút.`
      : "Chưa xác định được tuyến cụ thể (origin/destination hoặc route_id chưa khớp với dữ liệu trong hệ thống).";

    let tripsText = "Hiện chưa có thông tin chuyến nào trong ngữ cảnh.\n";
    if (trips.length > 0) {
      tripsText =
        "Danh sách chuyến tàu hiện có cho tuyến và ngày mà người dùng cung cấp:\n" +
        trips
          .map((t, idx) => {
            return `${idx + 1}. Trip ID: ${t.id}, tuyến ${t.route.origin} → ${
              t.route.destination
            }, khởi hành: ${t.departure_time}, đến nơi: ${
              t.arrival_time
            }, số hiệu tàu: ${t.vehicle_no}, trạng thái: ${t.status}`;
          })
          .join("\n");
    }

    // ================== 5. Prompt tư vấn chính ==================
    const mainPrompt = `
Bạn là trợ lý AI của hệ thống đặt vé tàu E-Train.

Nhiệm vụ:
- Hướng dẫn người dùng cách tìm tuyến, tìm chuyến theo ngày, chọn ghế, đặt vé.
- Tư vấn chuyến tàu dựa trên danh sách chuyến có trong dữ liệu bên dưới.
- Luôn trả lời NGẮN GỌN, rõ ràng, bằng TIẾNG VIỆT.
- Nếu thiếu thông tin (ga đi, ga đến, ngày, số vé, ...) thì hãy hỏi lại cho rõ.

[THÔNG TIN TUYẾN]
${routeText}

[THÔNG TIN CÁC CHUYẾN]
${tripsText}

[THÔNG TIN ĐÃ HIỂU TỪ TIN NHẮN]
origin hiện tại: ${origin || "null"}
destination hiện tại: ${destination || "null"}
date hiện tại: ${date || "null"}

[NGƯỜI DÙNG HỎI]
${message}

Hãy trả lời DUY NHẤT dưới dạng JSON, KHÔNG dùng markdown, KHÔNG dùng \`\`\`, với cấu trúc:
{
  "reply": "câu trả lời tiếng Việt cho người dùng, dạng hội thoại",
  "suggested_trips": [
    {
      "trip_id": 1,
      "reason": "Vì sao gợi ý chuyến này (ví dụ: giờ phù hợp, ít trễ...)"
    }
  ],
  "need_more_info": false,
  "parsed": {
    "origin": "ga đi (có thể giống hoặc khác origin hiện tại, nếu bạn hiểu rõ hơn)",
    "destination": "ga đến",
    "date": "YYYY-MM-DD hoặc null"
  }
}

- "suggested_trips" có thể là mảng rỗng nếu không có gợi ý.
- "parsed" giúp client hiểu lại bạn đang dùng origin/destination/date nào.
- Không được thêm bất kỳ text nào ngoài JSON hợp lệ.
`.trim();

    const mainResult = await model.generateContent(mainPrompt);
    let mainText = stripCodeFence(mainResult.response.text() || "");

    let data;
    try {
      data = JSON.parse(mainText);
    } catch (e) {
      console.error("AI main JSON parse failed, raw text:", mainText);
      data = {
        reply:
          mainText ||
          "Xin lỗi, hiện tại tôi chưa xử lý được yêu cầu này. Bạn thử hỏi lại giúp mình nhé.",
        suggested_trips: [],
        need_more_info: false,
        parsed: { origin, destination, date },
      };
    }

    if (!Array.isArray(data.suggested_trips)) data.suggested_trips = [];
    if (typeof data.need_more_info !== "boolean") data.need_more_info = false;
    if (typeof data.parsed !== "object" || data.parsed === null) {
      data.parsed = { origin, destination, date };
    }

    return res.json(data);
  } catch (err) {
    console.error("chatWithAI error:", err);
    return res.status(500).json({
      message: "AI error",
      detail: err.message,
    });
  }
};
