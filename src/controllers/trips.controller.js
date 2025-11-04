// src/controllers/trips.controller.js
import db from "../models/index.js";
import { Op } from "sequelize";
const { Trip, Route, SeatTemplateSeat, Carriage, TripSeat, TripSeatPricing } =
  db;

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
    const trip = await Trip.findByPk(id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Lấy ghế theo template + ghế đã bán theo toa của trip
    const [tplSeats, sold] = await Promise.all([
      SeatTemplateSeat.findAll({
        where: { template_id: trip.seat_template_id },
        raw: true,
        order: [
          ["pos_row", "ASC"],
          ["pos_col", "ASC"],
        ],
      }),
      TripSeat.findAll({
        include: [
          {
            model: Carriage,
            as: "carriage",
            attributes: [],
            where: { trip_id: id },
          },
        ],
        attributes: ["seat_code"],
        raw: true,
      }),
    ]);

    const soldSet = new Set(sold.map((s) => s.seat_code));

    // Kết quả tối giản đủ để FE render lưới ghế
    const seats = tplSeats.map((s) => ({
      seat_code: s.seat_code,
      class: s.seat_class, // "vip" | "standard"
      row: s.pos_row,
      col: s.pos_col,
      price: Number(s.base_price), // nếu có bảng override giá thì map thêm tại đây
      sold: soldSet.has(s.seat_code),
    }));

    return res.json({ trip_id: Number(id), seats });
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
    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      attributes: ["id", "seat_template_id"],
      transaction: t,
      raw: true,
    });

    let total = 0;
    for (const carr of carriages) {
      if (!carr.seat_template_id) continue;

      const tplSeats = await SeatTemplateSeat.findAll({
        where: { template_id: carr.seat_template_id },
        attributes: ["seat_code"],
        transaction: t,
        raw: true,
      });
      if (!tplSeats.length) continue;

      const payload = tplSeats.map((s) => ({
        carriage_id: carr.id,
        seat_code: s.seat_code,
      }));

      await TripSeat.bulkCreate(payload, {
        transaction: t,
        ignoreDuplicates: true,
      });
      total += payload.length;
    }

    await t.commit();
    return res.json({ message: "TripSeats generated", trip_id: tripId, total });
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "generate failed", detail: e.message });
  }
};

export const getOneTrip = async (req, res) => {
  try {
    const id = req.params;
    const trip = await Trip.findOne(id);
    console.log("trip", trip);
    res.status(200).json({
      message: "OK",
      trip,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      message: "Get trip header failed" + error.message,
    });
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
};
export default tripController;
