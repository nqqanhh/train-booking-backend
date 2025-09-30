// src/controllers/trips.controller.js
import db from "../models/index.js";
const { Trip, Route, SeatTemplateSeat, Carriage, TripSeat } = db;

// === user ===
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

    return res.json({ trips });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: e.message });
  }
};

// === admin ===
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

const tripController = {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  getSeatMap,
};
export default tripController;
