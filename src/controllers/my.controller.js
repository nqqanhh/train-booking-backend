import db from "../models/index.js";
const { Order, OrderItem, Ticket, SupportRequest } = db;

const getMyOrder = async (req, res) => {
  const orders = await Order.findAll({
    where: {
      user_id: req.user.id,
    },
    order: [["id", "DESC"]],
    include: [{ model: OrderItem, as: "order_items" }],
  });
  res.status(200).json({
    message: "OK",
    items: orders,
  });
};

export const getMyTickets = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const status = String(req.query.status || "all"); // active|used|upcoming|all
    const now = new Date();

    const items = await db.OrderItem.findAll({
      attributes: [
        "id",
        "order_id",
        "trip_id",
        "seat_code",
        "price",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: db.Order,
          as: "order",
          attributes: ["id", "status", "total_amount"],
        },
        {
          model: db.Ticket,
          as: "ticket",
          attributes: ["id", "status", "qr_payload", "issued_at", "used_at"],
        },
        {
          model: db.Trip,
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
              model: db.Route,
              as: "route",
              attributes: ["id", "origin", "destination"],
            },
          ],
        },
      ],
      where: { "$order.user_id$": req.user.id },
      order: [["id", "DESC"]],
    });

    // map thành view-model gọn gàng
    let tickets = items
      .filter((it) => !!it.ticket) // chỉ lấy các order_item đã phát hành vé
      .map((it) => {
        const t = it.ticket;
        const trip = it.trip || {};
        const route = trip.route || {};
        return {
          ticket_id: t.id,
          status: t.status, // "issued" | "used" | ...
          issued_at: t.issued_at,
          used_at: t.used_at,
          qr_payload: t.qr_payload,

          order_item_id: it.id,
          seat_code: it.seat_code,
          price: it.price,

          trip: {
            id: trip.id,
            vehicle_no: trip.vehicle_no,
            departure_time: trip.departure_time,
            arrival_time: trip.arrival_time,
            status: trip.status,
            route: {
              id: route.id,
              origin: route.origin,
              destination: route.destination,
            },
          },
          order: {
            id: it.order?.id,
            status: it.order?.status,
            total_amount: it.order?.total_amount,
          },
        };
      });

    // lọc theo query ?status=
    if (status === "valid") {
      tickets = tickets.filter((x) => x.status !== "used");
    } else if (status === "used") {
      tickets = tickets.filter((x) => x.status === "used");
    } else if (status === "refunded") {
      // tickets = tickets.filter((x) => new Date(x.trip?.departure_time) > now);
      tickets = tickets.filter((x) => x.status === "refunded");
    }

    res.json({ items: tickets, count: tickets.length });
  } catch (e) {
    res.status(500).json({ message: "my-tickets failed", detail: e.message });
  }
};

const getMySupportRequest = async (req, res) => {
  try {
    const myReq = await SupportRequest.findAll({
      where: { user_id: req.user.id },
    });
    res.status(200).json({
      message: "OK",
      myReq,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
    });
  }
};
const myController = { getMyOrder, getMyTickets, getMySupportRequest };
export default myController;
