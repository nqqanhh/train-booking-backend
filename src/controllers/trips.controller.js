// src/controllers/trips.controller.js
import db from "../models/index.js";
import { Op } from "sequelize";
const {
  Trip,
  Route,
  SeatTemplateSeat,
  Carriage,
  TripSeat,
  CarriageType,
} = db;

// === user ===
const listTrips = async (req, res) => {
  try {
    const route_id = Number(req.query.route_id);
    const date = req.query.date; // 'YYYY-MM-DD'
    const status = req.query.status || "scheduled";
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const offset = Number(req.query.offset || 0);

    //  if (!route_id || !date) {
    //    return res.status(400).json({ message: "route_id & date required" });
    //  }

    // day range [00:00, 23:59:59] theo Asia/Ho_Chi_Minh (DB đang lưu DATETIME local)
    const start = `${date} 00:00:00`;
    const end = `${date} 23:59:59`;

    const where = {
      route_id,
      departure_time: { [Op.between]: [start, end] },
    };
    if (status) where.status = status;

    const trips = await Trip.findAndCountAll({
      where,
      order: [["departure_time", "ASC"]],
      limit,
      offset,
      attributes: [
        "id",
        "route_id",
        "departure_time",
        "arrival_time",
        "vehicle_no",
        "status",
      ],
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
        // nếu cần số toa:
        {
          model: Carriage,
          as: "carriages",
          attributes: ["id"],
          required: false,
        },
      ],
    });

    // (tuỳ chọn) gắn thêm min_price & availability
    const includeAvailability = req.query.include_availability === "true";
    const includeMinPrice = req.query.include_min_price === "true";

    let data = trips.rows.map((t) => ({
      id: t.id,
      route_id: t.route_id,
      departure_time: t.departure_time,
      arrival_time: t.arrival_time,
      vehicle_no: t.vehicle_no,
      status: t.status,
      route: t.Route,
      carriages_count: t.Carriages?.length || 0,
    }));

    if (includeAvailability) {
      const ids = data.map((d) => d.id);
      // đếm available/sold theo trip: join qua Carriage
      const seats = await TripSeat.findAll({
        include: [
          {
            model: Carriage,
            as: "carriage",
            attributes: ["trip_id"],
            where: { trip_id: ids },
          },
        ],
        attributes: ["status", "carriage_id"],
        raw: true,
      });
      const stat = new Map(); // trip_id -> {available, sold}
      for (const s of seats) {
        // sequelize raw include alias: 'Carriage.trip_id'
        const tripId = s["Carriage.trip_id"];
        const o = stat.get(tripId) || { available: 0, sold: 0 };
        if (s.status === "sold") o.sold++;
        else o.available++;
        stat.set(tripId, o);
      }
      data = data.map((d) => ({
        ...d,
        availability: stat.get(d.id) || { available: 0, sold: 0 },
      }));
    }

    return res.json({
      count: trips.count,
      rows: data,
      limit,
      offset,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "list-trips failed", detail: e.message });
  }
};
// === admin ===
const getTrips = async (req, res) => {
  try {
    const trips = await Trip.findAll({
      include: [
        {
          model: Route,
          as: "route",
          attributes: ["id", "origin", "destination"],
        },
      ],
      order: [["departure_time", "ASC"]],
    });

    // (tuỳ nhu cầu) đếm số toa cho mỗi trip
    const tripIds = trips.map((t) => t.id);
    let carriageCount = {};
    if (tripIds.length) {
      const rows = await Carriage.findAll({
        where: { trip_id: tripIds },
        attributes: ["trip_id"],
        raw: true,
      });
      // bạn có thể build carriageCount[trip_id] nếu FE cần
    }

    return res.status(200).json({ trips });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: e.message });
  }
};

const createTrip = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      route_id,
      departure_time,
      arrival_time,
      vehicle_no,
      status = "scheduled",
      seat_template_id,
    } = req.body;
    if (
      !route_id ||
      !departure_time ||
      !arrival_time ||
      !vehicle_no ||
      !seat_template_id
    ) {
      await t.rollback();
      return res.status(400).json({
        message:
          "route_id, seat_template_id, departure_time, arrival_time, vehicle_no required",
      });
    }

    const trip = await Trip.create(
      {
        route_id,
        seat_template_id,
        departure_time,
        arrival_time,
        vehicle_no,
        status,
      },
      { transaction: t }
    );

    // (tuỳ chọn) tạo sẵn 1 Carriage '1' cho trip nếu chưa có migration tự tạo
    const [carriage] = await Carriage.findOrCreate({
      where: { trip_id: trip.id, carriage_no: "1" },
      defaults: { trip_id: trip.id, seat_template_id, carriage_no: "1" },
      transaction: t,
    });

    await t.commit();
    return res.status(201).json({ message: "Trip created", trip, carriage });
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "Internal error", detail: e.message });
  }
};

const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const [count] = await Trip.update(
      {
        route_id: req.body?.route_id,
        seat_template_id: req.body?.seat_template_id,
        departure_time: req.body?.departure_time,
        arrival_time: req.body?.arrival_time,
        vehicle_no: req.body?.vehicle_no,
        status: req.body?.status,
      },
      { where: { id } }
    );
    if (!count) return res.status(404).json({ message: "Trip not found" });
    const trip = await Trip.findByPk(id);
    return res.json({ message: "Trip updated", trip });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: e.message });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await Trip.destroy({ where: { id } }); // CASCADE sẽ xoá Carriages & TripSeats
    if (!count) return res.status(404).json({ message: "Trip not found" });
    return res.json({ message: "Trip deleted" });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: e.message });
  }
};

/** GET /trips/:id/seatmap */
const getSeatMap = async (req, res) => {
  try {
    const { id } = req.params; // tripId
    const tripId = Number(id);
    const trip = await Trip.findByPk(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // lấy tất cả Carriage của trip
    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      attributes: ["id", "carriage_no", "seat_template_id", "name"],
      raw: true,
    });
    if (!carriages.length) {
      return res.json({
        trip_id: tripId,
        carriages: [],
      });
    }

    const carriageIds = carriages.map((c) => c.id);

    // Seats theo template (layout) cho từng template_id
    const templateIds = [
      ...new Set(carriages.map((c) => c.seat_template_id).filter(Boolean)),
    ];

    const tplSeats = await SeatTemplateSeat.findAll({
      where: { template_id: templateIds },
      attributes: [
        "template_id",
        "seat_code",
        "pos_row",
        "pos_col",
        "seat_class",
        "base_price",
      ],
      order: [
        ["pos_row", "ASC"],
        ["pos_col", "ASC"],
      ],
      raw: true,
    });

    // TripSeats (price + status) cho từng carriage
    const tripSeats = await TripSeat.findAll({
      where: { carriage_id: carriageIds },
      attributes: ["carriage_id", "seat_code", "price", "status", "order_item_id"],
      raw: true,
    });

    // build map: template_id -> list template seats
    const tplMap = new Map();
    for (const s of tplSeats) {
      const key = s.template_id;
      const arr = tplMap.get(key) || [];
      arr.push(s);
      tplMap.set(key, arr);
    }

    // build map: carriage_id+seat_code -> TripSeat
    const tsMap = new Map();
    for (const ts of tripSeats) {
      tsMap.set(`${ts.carriage_id}|${ts.seat_code}`, ts);
    }

    const carriageSeatMaps = carriages.map((c) => {
      const tplList = tplMap.get(c.seat_template_id) || [];
      const seats = tplList.map((s) => {
        const key = `${c.id}|${s.seat_code}`;
        const ts = tsMap.get(key);
        const sold =
          ts?.status === "sold" || (ts?.order_item_id != null && ts?.status !== "refunded");

        return {
          seat_code: s.seat_code,
          class: s.seat_class || "standard",
          row: s.pos_row,
          col: s.pos_col,
          price:
            ts?.price != null
              ? Number(ts.price)
              : s.base_price != null
              ? Number(s.base_price)
              : 0,
          status: ts?.status || (sold ? "sold" : "available"),
          order_item_id: ts?.order_item_id ?? null,
        };
      });

      return {
        carriage_id: c.id,
        carriage_no: c.carriage_no,
        name: c.name,
        seats,
      };
    });

    return res.json({
      trip_id: tripId,
      carriages: carriageSeatMaps,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal error: " + error.message });
  }
};


// POST /api/trips/:id/generate-seats
export const generateSeatsForTrip = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const tripId = Number(req.params.id);
    if (!tripId) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      attributes: ["id", "seat_template_id"],
      transaction: t,
      raw: true,
    });

    if (!carriages.length) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "No carriages found for this trip" });
    }

    let total = 0;

    for (const carr of carriages) {
      if (!carr.seat_template_id) continue;

      const tplSeats = await SeatTemplateSeat.findAll({
        where: { template_id: carr.seat_template_id },
        attributes: ["seat_code", "base_price"],
        transaction: t,
        raw: true,
      });
      if (!tplSeats.length) continue;

      const payload = tplSeats.map((s) => ({
        carriage_id: carr.id,
        seat_code: s.seat_code,
        price: s.base_price != null ? Number(s.base_price) : 0,
        status: "available",
      }));

      await TripSeat.bulkCreate(payload, {
        transaction: t,
        ignoreDuplicates: true,
      });
      total += payload.length;
    }

    await t.commit();
    return res.json({
      message: "TripSeats generated",
      trip_id: tripId,
      total,
    });
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "generate failed", detail: e.message });
  }
};


export const getOneTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findOne({
      where: { id },
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
        {
          model: Carriage,
          as: "carriages",
          attributes: ["id", "carriage_no"],
          required: false,
        },
      ],
    });

    if (!trip) return res.status(404).json({ message: "Trip not found" });

    return res.status(200).json({ message: "OK", trip });
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: "Get trip header failed: " + error.message });
  }
};

const getAvailableSeats = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }
    const availableSeats = await TripSeat.count({
      include: [
        {
          model: Carriage,
          as: "carriage",
          attributes: [],
          where: { trip_id: tripId },
        },
      ],
      where: { status: "available" },
    });
    res.status(200).json({ trip_id: tripId, available_seats: availableSeats });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get available seats count",
      detail: error.message,
    });
  }
};

// GET /trips/:id/carriage-groups
const getCarriageGroupsForTrip = async (req, res) => {
  try {
    const tripId = Number(req.params.id);
    if (!tripId) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // 1) Lấy tất cả Carriage của trip, kèm SeatTemplate + CarriageType
    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      include: [
        {
          model: SeatTemplate,
          as: "seat_template", // đảm bảo association đặt đúng alias
          include: [
            {
              model: CarriageType,
              as: "carriage_type", // alias tuỳ bạn đặt trong model
            },
          ],
        },
      ],
      order: [["carriage_no", "ASC"]],
    });

    if (!carriages.length) {
      return res.json({
        trip_id: tripId,
        carriage_types: [],
      });
    }

    // 2) Lấy toàn bộ TripSeat của các carriage này để tính min_price + available_seats
    const carriageIds = carriages.map((c) => c.id);

    const tripSeats = await TripSeat.findAll({
      where: { carriage_id: carriageIds },
      attributes: ["carriage_id", "price", "status"],
      raw: true,
    });

    const seatStat = new Map();
    for (const s of tripSeats) {
      const cid = s.carriage_id;
      const stat = seatStat.get(cid) || {
        min_price: null,
        available_seats: 0,
        sold_seats: 0,
      };
      const price = s.price != null ? Number(s.price) : 0;
      if (stat.min_price == null || (price > 0 && price < stat.min_price)) {
        stat.min_price = price;
      }
      if (s.status === "available") stat.available_seats++;
      if (s.status === "sold") stat.sold_seats++;
      seatStat.set(cid, stat);
    }

    // 3) Group theo CarriageType
    const groupMap = new Map(); // key: type_code, value: { type_code, type_name, carriages: [] }

    for (const c of carriages) {
      const tpl = c.seat_template;
      const ctype = tpl?.carriage_type;

      const typeCode = ctype?.code || "unknown";
      const typeName = ctype?.name || tpl?.name || "Khác";

      const key = typeCode;
      const group = groupMap.get(key) || {
        type_code: typeCode,
        type_name: typeName,
        carriages: [],
      };

      const stat = seatStat.get(c.id) || {
        min_price: null,
        available_seats: 0,
        sold_seats: 0,
      };

      group.carriages.push({
        carriage_id: c.id,
        carriage_no: c.carriage_no,
        name: c.name,
        min_price: stat.min_price,
        available_seats: stat.available_seats,
        sold_seats: stat.sold_seats,
      });

      groupMap.set(key, group);
    }

    const carriageTypes = Array.from(groupMap.values());

    return res.json({
      trip_id: tripId,
      carriage_types: carriageTypes,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "get-carriage-groups failed", detail: e.message });
  }
};

const tripController = {
  listTrips,
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  getSeatMap,
  generateSeatsForTrip,
  getOneTrip,
  getAvailableSeats,
  getCarriageGroupsForTrip,
};
export default tripController;
