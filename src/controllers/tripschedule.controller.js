import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import tz from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(tz);

import db from "../models/index.js";

const { TripSchedule, Trip, Carriage, SeatTemplateSeat, TripSeat } = db;
const FREQS = new Set(["daily", "weekly", "custom"]);
const STATUSES = new Set(["active", "inactive"]);

function parseDOW(days_of_week) {
  if (!days_of_week) return [1, 2, 3, 4, 5, 6, 7];
  return String(days_of_week)
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => x >= 1 && x <= 7);
}

function withinDateRange(dateObj, start_date, end_date) {
  const d = dayjs(dateObj).startOf("day");
  const s = dayjs(start_date).startOf("day");
  if (d.isBefore(s)) return false;
  if (end_date && d.isAfter(dayjs(end_date).startOf("day"))) return false;
  return true;
}

function matchesFreq(dateObj, schedule) {
  if (schedule.freq === "daily") return true;
  const dow = dayjs(dateObj).isoWeekday(); // Mon=1..Sun=7
  const allow = parseDOW(schedule.days_of_week);
  return allow.includes(dow);
}

function isExcluded(dateObj, exceptions_json) {
  const dstr = dayjs(dateObj).format("YYYY-MM-DD");
  const skip = exceptions_json?.skip_dates || [];
  return skip.includes(dstr);
}

function overrideExtra(dateObj, exceptions_json) {
  const dstr = dayjs(dateObj).format("YYYY-MM-DD");
  const items = exceptions_json?.extra || [];
  return items.find((x) => x.date === dstr) || null;
}function parseJsonSafe(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      // nếu client đã gửi sẵn chuỗi không phải JSON (VD: "1,2,3")
      return v;
    }
  }
  // đã là object/array
  return v;
}

function toStrOrNull(x) {
  if (x === undefined || x === null) return null;
  if (typeof x === "string") {
    const s = x.trim();
    return s === "" ? null : s;
  }
  return String(x);
}

function normalizeScheduleBody(input = {}) {
  const b = { ...input };

  // ép số
  if (b.route_id != null) b.route_id = Number(b.route_id);
  if (b.eta_minutes != null) {
    const n = Number(b.eta_minutes);
    if (!Number.isFinite(n) || n <= 0)
      throw new Error("eta_minutes must be a positive number");
    b.eta_minutes = n;
  }

  // chuẩn hoá freq/status nếu có
  if (b.freq && !FREQS.has(b.freq)) {
    throw new Error(`freq must be one of: ${[...FREQS].join(", ")}`);
  }
  if (b.status && !STATUSES.has(b.status)) {
    throw new Error(`status must be one of: ${[...STATUSES].join(", ")}`);
  }

  // days_of_week: cho phép mảng -> "1,2,3"
  if (Array.isArray(b.days_of_week)) {
    b.days_of_week = b.days_of_week.join(",");
  } else if (b.days_of_week != null) {
    b.days_of_week = String(b.days_of_week);
  }

  // time/date
  b.depart_hm = toStrOrNull(b.depart_hm);
  b.start_date = toStrOrNull(b.start_date);
  b.end_date = toStrOrNull(b.end_date);

  // timezone mặc định
  if (!b.timezone) b.timezone = "Asia/Ho_Chi_Minh";

  // JSON columns: để Sequelize tự validate JSON
  b.carriages_json = parseJsonSafe(b.carriages_json);
  b.exceptions_json = parseJsonSafe(b.exceptions_json);

  return b;
}

// chỉ cho phép các field hợp lệ chui vào DB
const ALLOWED_FIELDS = [
  "route_id",
  "vehicle_no",
  "freq",
  "days_of_week",
  "start_date",
  "end_date",
  "depart_hm",
  "eta_minutes",
  "timezone",
  "status",
  "carriages_json",
  "exceptions_json",
];

function pickAllowed(body) {
  const out = {};
  for (const k of ALLOWED_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

function formatSequelizeError(err) {
  // Trả chi tiết gọn gàng cho Postman
  const details =
    err?.errors?.map((e) => ({
      path: e.path,
      message: e.message,
      type: e.type,
      value: e.value,
    })) ||
    err?.message ||
    String(err);
  return details;
}

export const createSchedule = async (req, res) => {
  try {
    const raw = req.body || {};
    // bắt buộc các trường chính
    const required = [
      "route_id",
      "vehicle_no",
      "depart_hm",
      "eta_minutes",
      "start_date",
    ];
    for (const k of required) {
      if (raw[k] === undefined || raw[k] === null || raw[k] === "")
        return res.status(400).json({ message: `${k} required` });
    }

    const normalized = normalizeScheduleBody(raw);
    const body = pickAllowed(normalized);

    const schedule = await TripSchedule.create(body, {
      fields: ALLOWED_FIELDS,
    });
    return res.status(201).json({ message: "OK", schedule });
  } catch (error) {
    return res.status(500).json({
      message: "Create schedule failed",
      detail: formatSequelizeError(error),
    });
  }
};

async function generateSeatsForCarriage(carriage_id, t) {
  const car = await Carriage.findByPk(carriage_id, { transaction: t });
  if (!car) return;
  const tplSeats = await SeatTemplateSeat.findAll({
    where: { template_id: car.seat_template_id },
    transaction: t,
  });
  if (!tplSeats.length) return;

  const payload = tplSeats.map((s) => ({
    carriage_id: car.id,
    seat_code: s.seat_code,
    status: "available", // giả định ENUM đã có "available"
    // nếu TripSeat có thêm các cột pos_row/pos_col/seat_class/base_price => có thể copy luôn:
    // pos_row: s.pos_row, pos_col: s.pos_col,
    // seat_class: s.seat_class, base_price: s.base_price,
  }));

  await TripSeat.bulkCreate(payload, {
    ignoreDuplicates: true,
    transaction: t,
  });
}

// export const createSchedule = async (req, res) => {
//   try {
//     const raw = req.body || {};
//     // bắt buộc các trường chính
//     const required = [
//       "route_id",
//       "vehicle_no",
//       "depart_hm",
//       "eta_minutes",
//       "start_date",
//     ];
//     for (const k of required) {
//       if (raw[k] === undefined || raw[k] === null || raw[k] === "")
//         return res.status(400).json({ message: `${k} required` });
//     }

//     const body = normalizeScheduleBody(raw);

//     const schedule = await TripSchedule.create(body);
//     return res.status(201).json({ message: "OK", schedule });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Create schedule failed",
//       detail: error?.message || String(error),
//     });
//   }
// };

export const listSchedules = async (req, res) => {
  try {
    const items = await TripSchedule.findAll({ order: [["id", "DESC"]] });
    res.status(200).json({
      message: "OK",
      items,
    });
  } catch (error) {
    res.status(500).json({
      message: "get schedule list failed " + error.message,
    });
  }
};

export const getSchedule = async (req, res) => {
  try {
    const schedule = await TripSchedule.findByPk(req.params.id);
    if (!schedule)
      return res.status(404).json({
        message: "Schedule not found",
      });
    res.status(200).json({
      message: "OK",
      schedule,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get schedule failed " + error.message,
    });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const scheduleId = Number(req.params.id);
    const [count] = await TripSchedule.update(req.body || {}, {
      where: { id: scheduleId },
    });
    if (!count)
      return res.status(404).json({
        message: "Schedule not found",
      });
    const schedule = await TripSchedule.findByPk(scheduleId);
    res.status(200).json({
      message: "OK",
      schedule,
    });
  } catch (error) {
    res.status(500).json({
      message: "Update schedule failed " + error.message,
    });
  }
};

export const generateFromSchedule = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const days = Number(req.query.days || 14);
    const sch = await TripSchedule.findByPk(id, { transaction: t });
    if (!sch) {
      await t.rollback();
      return res.status(404).json({ message: "Schedule not found" });
    }
    if (sch.status !== "active") {
      await t.rollback();
      return res.status(400).json({ message: "Schedule is inactive" });
    }

    const tzName = sch.timezone || "Asia/Ho_Chi_Minh";
    const today = dayjs().tz(tzName).startOf("day");

    const createdTrips = [];

    for (let d = 0; d < days; d++) {
      const date = today.add(d, "day");
      if (!withinDateRange(date, sch.start_date, sch.end_date)) continue;
      if (isExcluded(date, sch.exceptions_json)) continue;
      if (!matchesFreq(date, sch)) continue;

      // override giờ chạy nếu có extra
      const extra = overrideExtra(date, sch.exceptions_json);
      const departHM = extra?.depart_hm || sch.depart_hm;
      const dep = dayjs.tz(`${date.format("YYYY-MM-DD")} ${departHM}`, tzName);
      const arr = dep.add(sch.eta_minutes, "minute");

      // idempotent theo unique index uk_trip_unique
      const [trip, created] = await Trip.findOrCreate({
        where: {
          route_id: sch.route_id,
          vehicle_no: sch.vehicle_no,
          departure_time: dep.toDate(),
        },
        defaults: {
          arrival_time: arr.toDate(),
          status: "scheduled",
          seat_template_id: null,
        },
        transaction: t,
      });

      if (!created) continue;

      // tạo carriages & seats theo carriages_json
      const defs = Array.isArray(sch.carriages_json) ? sch.carriages_json : [];
      for (const def of defs) {
        const car = await Carriage.create(
          {
            trip_id: trip.id,
            seat_template_id: def.seat_template_id,
            name: def.name || `Carriage ${def.carriage_no || ""}`.trim(),
            carriage_no: def.carriage_no || null,
          },
          { transaction: t }
        );
        await generateSeatsForCarriage(car.id, t);
      }

      createdTrips.push({
        trip_id: trip.id,
        departure_time: dep.toISOString(),
      });
    }

    await t.commit();
    return res.json({
      message: "Generated trips",
      count: createdTrips.length,
      trips: createdTrips,
    });
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "generate failed", detail: e.message });
  }
};
