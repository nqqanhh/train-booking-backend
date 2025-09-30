// src/controllers/tickets.controller.js
import db from "../models/index.js";
const { Ticket, OrderItem } = db;

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
      // Đánh dấu ghế sold: tìm TripSeat theo (carriage_id từ Carriage.trip_id, seat_code)
      const carriages = await db.Carriage.findAll({
        where: { trip_id: it.trip_id },
        attributes: ["id"],
        transaction: t,
      });
      const carriageIds = carriages.map((c) => c.id);
      if (carriageIds.length) {
        await db.TripSeat.update(
          { order_item_id: it.id, sold_at: new Date() },
          {
            where: { carriage_id: carriageIds, seat_code: it.seat_code },
            transaction: t,
          }
        );
      }

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
