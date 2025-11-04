// src/controllers/tickets.controller.js
import db from "../models/index.js";
const { Ticket, OrderItem, Trip, Route, PassengerProfile, Carriage, TripSeat } =
  db;

/**
 * Tạo ticket cho toàn bộ OrderItems thuộc 1 order.
 * Đồng thời đánh dấu TripSeat đã bán (map qua Carriage theo trip_id).
 */

export async function generateTickets(orderId, tExternal = null) {
  const useExternalTx = !!tExternal;
  const t = tExternal || (await db.sequelize.transaction());
  try {
    const items = await db.OrderItem.findAll({
      where: { order_id: orderId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!items.length) {
      if (!useExternalTx) await t.commit();
      return [];
    }

    const out = [];
    for (const it of items) {
      //       // Đánh dấu ghế sold: tìm TripSeat theo (carriage_id từ Carriage.trip_id, seat_code)
      // const carriages = await db.Carriage.findAll({
      //   where: { trip_id: it.trip_id },
      //   attributes: ["id"],
      //   transaction: t,
      // });
      // const carriageIds = carriages.map((c) => c.id);
      // if (carriageIds.length) {
      //   await db.TripSeat.update(
      //     { order_item_id: it.id, sold_at: new Date() },
      //     {
      //       where: { carriage_id: carriageIds, seat_code: it.seat_code },
      //       transaction: t,
      //     }
      //   );
      // }
      // Ticket 1–1 với OrderItem
      const qrObj = { order_item_id: it.id, seat_code: it.seat_code };
      const [ticket] = await db.Ticket.findOrCreate({
        where: { order_item_id: it.id },
        defaults: {
          order_item_id: it.id,
          qr_payload: JSON.stringify(qrObj),
          status: "valid",
          issued_at: new Date(),
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      out.push(ticket);
    }

    if (!useExternalTx) await t.commit();
    return out;
  } catch (e) {
    if (!useExternalTx) await t.rollback();
    throw e;
  }
}

/** POST /tickets/validate */
export const validateTicket = async (req, res) => {
  try {
    const { qr_payload, trip_id: tripIdFromClient } = req.body || {};
    if (!qr_payload)
      return res.status(400).json({ message: "Missing QR payload" });

    let parsed;
    try {
      parsed =
        typeof qr_payload === "string" ? JSON.parse(qr_payload) : qr_payload;
    } catch {
      return res.status(400).json({ message: "Invalid QR payload" });
    }

    const { order_item_id, seat_code } = parsed || {};
    if (!order_item_id || !seat_code) {
      return res
        .status(400)
        .json({ message: "QR must include order_item_id & seat_code" });
    }

    // 1) Tìm ticket theo order_item_id
    const ticket = await Ticket.findOne({
      where: { order_item_id },
      include: [{ model: OrderItem, as: "order_item" }],
    });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // 2) Trạng thái vé
    if (ticket.status !== "valid") {
      return res
        .status(400)
        .json({ message: `Ticket is ${ticket.status}`, ticket });
    }

    // 3) So khớp seat_code (chống sửa payload)
    if (ticket.order_item?.seat_code !== seat_code) {
      return res.status(400).json({ message: "Seat code mismatch" });
    }

    // 4) (tuỳ chọn) So khớp trip_id nếu client gửi vào
    const tripId = ticket.order_item?.trip_id;
    if (tripIdFromClient && Number(tripIdFromClient) !== Number(tripId)) {
      return res.status(400).json({ message: "Trip mismatch" });
    }

    // 5) (khuyến nghị) Kiểm tra thời gian quét trong cửa sổ cho phép
    const trip = await Trip.findByPk(tripId, {
      attributes: ["departure_time", "arrival_time"],
      raw: true,
    });
    if (trip?.departure_time) {
      const now = new Date();
      const dep = new Date(trip.departure_time);
      const beforeMinutes = 60; // cho quét sớm 60’
      const afterMinutes = 120; // cho quét trễ 120’
      if (
        now < new Date(dep.getTime() - beforeMinutes * 60000) ||
        now > new Date(dep.getTime() + afterMinutes * 60000)
      ) {
        // Bạn có thể đổi thành 400 để chặn; ở đây cho warn nhẹ
        // return res.status(400).json({ message: "Scan time not allowed" });
      }
    }

    // 6) (khuyến nghị) Đối chiếu TripSeat đã gắn order_item_id
    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      attributes: ["id"],
      raw: true,
    });
    const carriageIds = carriages.map((c) => c.id);
    if (carriageIds.length) {
      const seatRow = await TripSeat.findOne({
        where: { carriage_id: carriageIds, seat_code },
        attributes: ["order_item_id"],
        raw: true,
      });
      if (!seatRow || Number(seatRow.order_item_id) !== Number(order_item_id)) {
        return res
          .status(400)
          .json({ message: "Seat not assigned to this ticket" });
      }
    }

    // 7) Đổi trạng thái vé → used
    ticket.status = "used";
    ticket.used_at = new Date();
    await ticket.save();

    return res
      .status(200)
      .json({ message: "Ticket validated successfully", ticket });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", detail: err.message });
  }
};

/** GET /tickets/by-order/:orderId */
export async function listTicketsByOrder(req, res) {
  try {
    const { orderId } = req.params;
    const items = await db.OrderItem.findAll({
      where: { order_id: orderId },
      include: [{ model: db.Ticket, as: "ticket" }], // cần OrderItem.hasOne(Ticket, { as: "ticket" })
      order: [["id", "ASC"]],
    });
    return res.json({ order_id: orderId, items });
  } catch (error) {
    return res.status(500).json({ message: "error " + error.message });
  }
}

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll();
    res.status(200).json({
      message: "OK",
      tickets,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error " + error.message,
    });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid ticket id" });

    // Include theo alias đã dùng trong project:
    // - Ticket belongsTo OrderItem as 'order_item'
    // - OrderItem belongsTo Trip as 'trip'
    // - Trip belongsTo Route as 'route'
    // - OrderItem belongsTo PassengerProfile as 'passenger'
    const ticket = await Ticket.findByPk(id, {
      attributes: [
        "id",
        "order_item_id",
        "qr_payload",
        "status",
        "issued_at",
        "used_at",
        "created_at",
        "updated_at",
      ],
      include: [
        {
          model: OrderItem,
          as: "order_item",
          attributes: ["id", "trip_id", "seat_code", "price", "created_at"],
          include: [
            {
              model: Trip,
              as: "trip",
              attributes: [
                "id",
                "route_id",
                "vehicle_no",
                "departure_time",
                "arrival_time",
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
              ],
            },
            {
              model: PassengerProfile,
              as: "passenger",
              attributes: ["id", "full_name", "phone"],
            },
          ],
        },
      ],
    });

    if (!ticket) return res.status(404).json({ message: "ticket not found" });

    // Chuẩn hoá payload trả ra gọn gàng
    const oi = ticket.order_item || {};
    const trip = oi.trip || {};
    const route = trip.route || {};
    const depart = trip.departure_time ? new Date(trip.departure_time) : null;

    const detail = {
      ticket: {
        id: ticket.id,
        status: ticket.status,
        issued_at: ticket.issued_at,
        used_at: ticket.used_at,
        qr_payload: ticket.qr_payload,
      },
      seat: {
        seat_code: oi.seat_code,
        price: oi.price != null ? Number(oi.price) : null,
      },
      passenger: oi.passenger
        ? {
            id: oi.passenger.id,
            full_name: oi.passenger.full_name,
            phone: oi.passenger.phone,
          }
        : null,
      trip: {
        id: trip.id,
        vehicle_no: trip.vehicle_no,
        route_id: trip.route_id,
        status: trip.status,
        departure_time: trip.departure_time,
        arrival_time: trip.arrival_time,
        travel_date: depart
          ? `${depart.getFullYear()}-${String(depart.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(depart.getDate()).padStart(2, "0")}`
          : null,
        route: route.id
          ? {
              id: route.id,
              origin: route.origin,
              destination: route.destination,
              distance_km:
                route.distance_km != null ? Number(route.distance_km) : null,
              eta_minutes:
                route.eta_minutes != null ? Number(route.eta_minutes) : null,
            }
          : null,
      },
    };

    return res.status(200).json({ message: "OK", detail });
  } catch (error) {
    return res.status(500).json({
      message: "Internal error",
      detail: error.message,
      sqlMsg: error.sql,
    });
  }
};
