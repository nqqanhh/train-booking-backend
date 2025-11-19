import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUpcomingTrips } from "../services/userService.js";
import db from "../models/index.js";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
import { Op } from "sequelize";
const { Route, Trip } = db;
export const chatWithAI = async (req, res) => {
  try {
    const { message, origin, destination, date } = req.body;

    // 1. Query route + trips từ DB nếu client truyền đầy đủ
    let route = null;
    let trips = [];

    if (origin && destination) {
      route = await Route.findOne({
        where: { origin, destination },
      });
    }

    if (route && date) {
      const start = `${date} 00:00:00`;
      const end = `${date} 23:59:59`;

      trips = await Trip.findAll({
        where: {
          route_id: route.id,
          departure_time: { [Op.between]: [start, end] },
          status: "scheduled",
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

    // 2. Convert dữ liệu DB thành text context
    const routeText = route
      ? `Tuyến hiện tại: ${route.origin} → ${route.destination}, khoảng cách ${route.distance_km} km, thời gian dự kiến ${route.eta_minutes} phút.`
      : "Chưa xác định được tuyến cụ thể (origin/destination chưa đủ hoặc không tồn tại trong hệ thống).";

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

    // 3. Ghép toàn bộ prompt thành một string
    const prompt = `
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

[NGƯỜI DÙNG HỎI]
${message}

[HƯỚNG DẪN TRẢ LỜI]
- Nếu có chuyến phù hợp, hãy gợi ý 1–3 chuyến cụ thể (nêu giờ khởi hành, tuyến, gợi ý).
- Nếu không có chuyến nào, hãy thông báo nhẹ nhàng và gợi ý đổi ngày/tuyến.
`.trim();

    // 4. Gọi Gemini đúng format (chỉ cần 1 string)
    const result = await model.generateContent(prompt);

    const reply =
      result.response.text() || "Xin lỗi, hiện tại tôi không trả lời được.";

    return res.json({ reply });
  } catch (error) {
    console.error("tripAssistant error:", error);
    return res.status(500).json({
      message: "AI error",
      detail: error.message,
    });
  }
};
