import db from "../models/index.js";
const { Ticket, OrderItem, Trip, TripSeat } = db;

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
      // TripSeat (sold) — unique (trip_id, seat_code)
      try {
        await db.TripSeat.create(
          {
            trip_id: it.trip_id,
            seat_code: it.seat_code,
            order_item_id: it.id,
            sold_at: new Date(),
          },
          { transaction: t }
        );
      } catch (err) {
        const isUnique =
          err?.name === "SequelizeUniqueConstraintError" ||
          err?.original?.code === "ER_DUP_ENTRY";
        if (!isUnique) throw err;
      }

      // Ticket 1–1 với order_item
      const payload = {
        order_item_id: it.id,
        trip_id: it.trip_id,
        seat_code: it.seat_code,
        passenger_id: it.passenger_id ?? null,
      };

      const [ticket] = await db.Ticket.findOrCreate({
        where: { order_item_id: it.id },
        defaults: {
          order_item_id: it.id,
          qr_payload: JSON.stringify(payload),
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
export const validateTicket = async (req, res) => {
  try {
    const { qr_payload } = req.body;
    if (!qr_payload) {
      return res.status(400).json({ message: "Missing QR payload" });
    }

    let parsed;
    try {
      parsed =
        typeof qr_payload === "string" ? JSON.parse(qr_payload) : qr_payload;
    } catch {
      return res.status(400).json({ message: "Invalid QR payload" });
    }

    // Lấy ticket theo order_item_id
    const ticket = await Ticket.findOne({
      where: { order_item_id: parsed.ticket_id },
    });

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.status !== "valid") {
      return res
        .status(400)
        .json({ message: `Ticket already ${ticket.status}` });
    }

    // Update status -> used
    ticket.status = "used";
    ticket.used_at = new Date();
    await ticket.save();

    return res.status(200).json({
      message: "Ticket validated successfully",
      ticket,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      detail: err.message,
    });
  }
};

export async function listTicketsByOrder(req, res) {
  try {
    const { orderId } = req.params;
    const items = await OrderItem.findAll({
      where: { order_id: orderId },
      include: [{ model: Ticket, as: "ticket" }],
      order: [["id", "ASC"]],
    });
    return res.json({
      order_id: orderId,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      message: "error " + error.message,
    });
  }
}
