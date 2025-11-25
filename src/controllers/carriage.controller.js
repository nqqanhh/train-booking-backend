// src/controllers/carriages.controller.js
import { ensureTripSeatsForTrip } from "../services/tripseat.service.js";
import db from "../models/index.js";
const {
  Carriage,
  Trip,
  SeatTemplate,
  SeatTemplateSeat,
  TripSeat,
  CarriageType,
} = db;

// async function ensureTripSeatsForTrip(trip_id, t) {
//   const carriages = await Carriage.findAll({
//     where: { trip_id },
//     attributes: ["id", "seat_template_id"],
//     transaction: t,
//     raw: true,
//   });
//   if (!carriages.length) return;

//   const tplIds = [...new Set(carriages.map((c) => c.seat_template_id))];
//   const tplSeats = await SeatTemplateSeat.findAll({
//     where: { template_id: tplIds },
//     attributes: ["template_id", "seat_code"],
//     transaction: t,
//     raw: true,
//   });

//   const byTpl = new Map();
//   for (const s of tplSeats) {
//     if (!byTpl.has(s.template_id)) byTpl.set(s.template_id, []);
//     byTpl.get(s.template_id).push(s.seat_code);
//   }

//   const now = new Date();
//   const rows = [];
//   for (const c of carriages) {
//     const codes = byTpl.get(c.seat_template_id) || [];
//     for (const code of codes) {
//       rows.push({
//         carriage_id: c.id,
//         seat_code: code,
//         status: "available", // cần DEFAULT 'available' trong DB
//         created_at: now,
//         updated_at: now,
//       });
//     }
//   }

//   if (rows.length) {
//     await TripSeat.bulkCreate(rows, {
//       transaction: t,
//       ignoreDuplicates: true, // cần unique (carriage_id, seat_code)
//     });
//   }
// }

export const listCarriagesByTrip = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const items = await Carriage.findAll({
      where: { trip_id: tripId },
      include: [
        {
          model: SeatTemplate,
          as: "seat_template",
          attributes: ["id", "name", "meta_json"],
        },
      ],
      order: [["carriage_no", "ASC"]],
    });
    // đổi 'items' -> 'carriages' cho khớp UI Tabs
    return res.json({ carriages: items });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: err.message });
  }
};

export const createCarriage = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const tripId = Number(req.params.tripId);
    const { carriage_no, seat_template_id } = req.body || {};
    if (!tripId || !carriage_no || !seat_template_id) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "tripId, carriage_no, seat_template_id required" });
    }

    const trip = await Trip.findByPk(tripId, { transaction: t });
    if (!trip) {
      await t.rollback();
      return res.status(404).json({ message: "Trip not found" });
    }

    const tpl = await SeatTemplate.findByPk(seat_template_id, {
      transaction: t,
    });
    if (!tpl) {
      await t.rollback();
      return res.status(404).json({ message: "SeatTemplate not found" });
    }

    const existed = await Carriage.findOne({
      where: { trip_id: tripId, carriage_no: String(carriage_no) },
      transaction: t,
    });
    if (existed) {
      await t.rollback();
      return res.status(409).json({ message: "Carriage_no already exists" });
    }

    const carriage = await Carriage.create(
      { trip_id: tripId, seat_template_id, carriage_no: String(carriage_no) },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ carriage });
  } catch (err) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "Internal error", detail: err.message });
  }
};

export const deleteCarriage = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const count = await Carriage.destroy({ where: { id }, transaction: t });
    if (!count) {
      await t.rollback();
      return res.status(404).json({ message: "Carriage not found" });
    }
    await t.commit();
    return res.json({ message: "Carriage deleted" });
  } catch (err) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "Internal error", detail: err.message });
  }
};

// POST /carriages/:id/generate-seats
export const generateSeats = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const id = Number(req.params.id);
    if (!id) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid carriage id" });
    }

    const carriage = await Carriage.findByPk(id, { transaction: t });
    if (!carriage) {
      await t.rollback();
      return res.status(404).json({ message: "Carriage not found" });
    }

    const tplSeats = await SeatTemplateSeat.findAll({
      where: { template_id: carriage.seat_template_id },
      attributes: ["seat_code", "base_price"],
      transaction: t,
      raw: true,
    });
    if (!tplSeats.length) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "SeatTemplate has no seats configured" });
    }

    const payload = tplSeats.map((s) => ({
      carriage_id: carriage.id,
      seat_code: s.seat_code,
      price: s.base_price != null ? Number(s.base_price) : 0,
      status: "available",
    }));

    await TripSeat.bulkCreate(payload, {
      transaction: t,
      ignoreDuplicates: true,
    });

    await t.commit();
    const items = await TripSeat.findAll({
      where: { carriage_id: id },
      order: [["seat_code", "ASC"]],
    });

    return res.json({
      message: "Seats generated for carriage",
      carriage_id: id,
      count: items.length,
      items,
    });
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "generate seats failed", detail: e.message });
  }
};

export const listSeatsByCarriage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const seats = await TripSeat.findAll({
      where: { carriage_id: id },
      order: [["seat_code", "ASC"]],
    });
    return res.json({ items: seats });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: err.message });
  }
};

export const listSeatsByTrip = async (req, res) => {
  try {
    const tripId = Number(req.params.tripId);
    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      attributes: ["id", "carriage_no"],
      order: [["carriage_no", "ASC"]],
    });
    const ids = carriages.map((c) => c.id);
    if (!ids.length) return res.json({ carriages: [], seats: [] });

    const seats = await TripSeat.findAll({
      where: { carriage_id: ids },
      include: [
        { model: Carriage, as: "carriage", attributes: ["carriage_no"] },
      ],
      order: [
        [{ model: Carriage, as: "carriage" }, "carriage_no", "ASC"],
        ["seat_code", "ASC"],
      ],
    });

    return res.json({ carriages, seats });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: err.message });
  }
};
// GET /carriages/:id/seatmap
const getCarriageSeatMap = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid carriage id" });
    }

    const carriage = await Carriage.findByPk(id, {
      include: [
        {
          model: SeatTemplate,
          as: "seat_template",
        },
      ],
    });

    if (!carriage) {
      return res.status(404).json({ message: "Carriage not found" });
    }

    const tpl = carriage.seat_template;
    if (!tpl) {
      return res
        .status(400)
        .json({ message: "Carriage has no seat template assigned" });
    }

    const [tplSeats, tripSeats] = await Promise.all([
      SeatTemplateSeat.findAll({
        where: { template_id: tpl.id },
        attributes: [
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
      }),
      TripSeat.findAll({
        where: { carriage_id: id },
        attributes: ["seat_code", "price", "status", "order_item_id"],
        raw: true,
      }),
    ]);

    const tsMap = new Map(tripSeats.map((ts) => [ts.seat_code, ts]));

    const seats = tplSeats.map((s) => {
      const ts = tsMap.get(s.seat_code);
      const sold =
        ts?.status === "sold" ||
        (ts?.order_item_id != null && ts?.status !== "refunded");

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

    return res.json({
      carriage_id: carriage.id,
      carriage_no: carriage.carriage_no,
      name: carriage.name,
      seats,
    });
  } catch (error) {
    console.error("getCarriageSeatMap error:", error);
    return res
      .status(500)
      .json({ message: "Internal error: " + error.message });
  }
};

export const generateSeatsEndpoint = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const id = Number(req.params.id);
    if (!id) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid carriage id" });
    }

    const carriage = await Carriage.findByPk(id, { transaction: t });
    if (!carriage) {
      await t.rollback();
      return res.status(404).json({ message: "Carriage not found" });
    }

    const tplSeats = await SeatTemplateSeat.findAll({
      where: { template_id: carriage.seat_template_id },
      attributes: ["seat_code", "base_price"],
      transaction: t,
      raw: true,
    });
    if (!tplSeats.length) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "SeatTemplate has no seats configured" });
    }

    const payload = tplSeats.map((s) => ({
      carriage_id: carriage.id,
      seat_code: s.seat_code,
      price: s.base_price != null ? Number(s.base_price) : 0,
      status: "available",
    }));

    await TripSeat.bulkCreate(payload, {
      transaction: t,
      ignoreDuplicates: true,
    });

    await t.commit();
    const items = await TripSeat.findAll({
      where: { carriage_id: id },
      order: [["seat_code", "ASC"]],
    });

    return res.json({
      message: "Seats generated for carriage",
      carriage_id: id,
      count: items.length,
      items,
    });
  } catch (err) {
    await t.rollback();
    console.error("generateSeatsEndpoint error:", err);
    return res
      .status(500)
      .json({ message: "generate-seats failed", detail: err.message });
  }
};

export default {
  listCarriagesByTrip,
  createCarriage,
  deleteCarriage,
  generateSeatsEndpoint,
  listSeatsByCarriage,
  listSeatsByTrip,
  getCarriageSeatMap,
};
