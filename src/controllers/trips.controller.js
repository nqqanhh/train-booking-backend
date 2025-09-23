import db from "../../models/index.js";
const { Trip, Route, SeatTemplate, TripSeat, TripSeatPricing } = db;
import { parseTod, parseYMD, yyyymmdd } from "../utils/format-date-time.js";
//===user===
const getTrips = async (req, res) => {
  try {
    const { origin, destination, date } = req.query;
    const where = { status: "scheduled" };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.departure_time = {
        [db.Sequelize.Op.Between]: [start, end],
      };
    }
    const trips = await Trip.findAll({
      where,
      include: [
        {
          model: Route,
          as: "route",
          where: {
            ...(origin ? { origin } : {}),
            ...(destination ? { destination } : {}),
          },
        },
      ],
      order: [["departure_time", "ASC"]],
    });
    res.status(200).json({
      message: "Get trips successfuly",
      trips: trips,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

//===admin===

//create trip
const createTrip = async (req, res) => {
  try {
    const {
      route_id,
      seat_template_id,
      departure_time,
      arrival_time,
      vehicle_no,
    } = req.body;

    if (
      !route_id ||
      !seat_template_id ||
      !departure_time ||
      !arrival_time ||
      !vehicle_no
    ) {
      return res.status(400).json({
        message: "Missing credentials",
      });
    }
    // (Khuyến nghị) kiểm tra tồn tại để tránh lỗi FK khó đọc
    const [route, template] = await Promise.all([
      Route.findByPk(route_id),
      SeatTemplate.findByPk(seat_template_id),
    ]);
    if (!route) return res.status(404).json({ message: "Route not found" });
    if (!template)
      return res.status(404).json({ message: "Seat template not found" });

    const newTrip = {
      route_id,
      seat_template_id,
      departure_time: new Date(departure_time),
      arrival_time: new Date(arrival_time),
      vehicle_no,
      status: "scheduled",
    };
    await Trip.create(newTrip);
    res.status(200).json({
      message: "Create new trip successfully",
      trip: newTrip,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

//update trip
const updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const {
      route_id,
      seat_template_id,
      departure_time,
      arrival_time,
      vehicle_no,
    } = req.body;
    const pickedTrip = await Trip.findOne({ where: { id: tripId } });
    if (!pickedTrip) {
      return res.status(404).json({ message: "Couldn't find this trip" });
    }
    if (route_id) pickedTrip.route_id = route_id;
    if (seat_template_id) pickedTrip.seat_template_id = seat_template_id;
    if (departure_time) pickedTrip.departure_time = departure_time;
    if (arrival_time) pickedTrip.arrival_time = arrival_time;
    if (vehicle_no) pickedTrip.vehicle_no = vehicle_no;

    await Trip.update(pickedTrip);
    res.status(200).json({
      message: "Trip updated successfully",
      updatedTrip: pickedTrip,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

//delete trip
const deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const count = await Trip.destroy({ where: { id: tripId } });
    if (!count) return res.status(404).json({ message: "Trip not found" });
    res.status(200).json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

// const getSeatMap = async (req, res) => {
//   try {
//     const { id } = req.params; //tripId
//     const trip = await Trip.findByPk(id);
//     if (!id) return res.status(404).json({ message: "Trip not found" });

//     const [tplSeats, overrides, sold] = await Promise.all([
//       SeatTemplate.findAll({
//         where: { id: trip.seat_template_id },
//         raw: true,
//       }),
//       TripSeatPricing.findAll({ where: { trip_id: id }, raw: true }),
//       TripSeat.findAll({
//         where: { trip_id: id },
//         attributes: ["seat_code"],
//         raw: true,
//       }),
//     ]);

//     const overrideMap = new Map(
//       overrides.map((o) => [o.seat_code, Number(o.price)])
//     );
//     const soldSet = new Set(sold.map((s) => s.seat_code));
//     const seats = tplSeats.map((s) => ({
//       seat_code: s.seat_code,
//       class: s.seat_class,
//       row: s.pos_row,
//       col: s.pos_col,
//       price: overrideMap.get(s.seat_code) ?? Number(s.base_price),
//       sold: soldSet.has(s.seat_code),
//     }));

//     res.status(200).json({
//       message: "OK",
//       trip_id: id,
//       seats,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Internal error: " + error.message,
//       sqlMessage: error.sql,
//     });
//   }
// };

//ko can TripSeatPricing
const getSeatMap = async (req, res) => {
  const { id } = req.params;
  const trip = await db.Trip.findByPk(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  const [tplSeats, sold] = await Promise.all([
    db.SeatTemplateSeat.findAll({
      where: { template_id: trip.seat_template_id },
      raw: true,
      order: [
        ["pos_row", "ASC"],
        ["pos_col", "ASC"],
      ],
    }),
    db.TripSeat.findAll({
      where: { trip_id: id },
      attributes: ["seat_code"],
      raw: true,
    }),
  ]);

  const soldSet = new Set(sold.map((s) => s.seat_code));

  const seats = tplSeats.map((s) => ({
    seat_code: s.seat_code,
    class: s.seat_class,
    row: s.pos_row,
    col: s.pos_col,
    price: Number(s.base_price),
    sold: soldSet.has(s.seat_code),
  }));

  return res.json({ trip_id: id, seats });
};
const tripController = {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  getSeatMap
};
export default tripController;
