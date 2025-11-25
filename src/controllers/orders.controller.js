import { Op } from "sequelize";
import db from "../models/index.js";

const {
  Trip,
  Carriage,
  TripSeat,
  Order,
  OrderItem,
  PassengerProfile,
  Payment,
  User,
} = db;

// đảm bảo tất cả item cùng 1 trip
function validateOrderItems(items = []) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("items must be a non-empty array");
  }

  const tripId = Number(items[0].trip_id);
  if (!tripId || Number.isNaN(tripId)) {
    throw new Error("trip_id is invalid");
  }

  for (const it of items) {
    if (Number(it.trip_id) !== tripId) {
      throw new Error("All items in an order must belong to the same trip");
    }
    if (!it.seat_code) {
      throw new Error("seat_code is required for each item");
    }
  }

  return tripId;
}

// GET /orders/preview
export const previewOrder = async (req, res) => {
  try {
    const items = req.body?.items || [];
    let tripId;

    try {
      tripId = validateOrderItems(items);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      attributes: ["id", "carriage_no"],
      raw: true,
    });
    if (!carriages.length) {
      return res
        .status(400)
        .json({ message: "Trip has no carriages configured" });
    }

    const carriageIds = carriages.map((c) => c.id);
    const seatCodes = items.map((it) => it.seat_code);

    const tripSeats = await TripSeat.findAll({
      where: {
        carriage_id: { [Op.in]: carriageIds },
        seat_code: seatCodes,
      },
      raw: true,
    });

    const seatMap = new Map();
    for (const s of tripSeats) {
      const arr = seatMap.get(s.seat_code) || [];
      arr.push(s);
      seatMap.set(s.seat_code, arr);
    }

    let total = 0;
    const details = [];

    for (const it of items) {
      const list = seatMap.get(it.seat_code) || [];
      const seat = list.find(
        (s) => s.status === "available" && !s.order_item_id
      );
      if (!seat) {
        return res.status(400).json({
          message: `Seat ${it.seat_code} is not available`,
        });
      }

      const price = seat.price != null ? Number(seat.price) : 0;
      total += price;

      details.push({
        trip_seat_id: seat.id,
        seat_code: seat.seat_code,
        price,
        carriage_id: seat.carriage_id,
      });
    }

    return res.json({
      trip_id: tripId,
      currency: "VND",
      total_amount: total,
      items: details,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "previewOrder failed", detail: e.message });
  }
};

// POST /orders
export const createOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const items = req.body?.items || [];
    let tripId;

    try {
      tripId = validateOrderItems(items);
    } catch (e) {
      await t.rollback();
      return res.status(400).json({ message: e.message });
    }

    const trip = await Trip.findByPk(tripId);
    if (!trip) {
      await t.rollback();
      return res.status(404).json({ message: "Trip not found" });
    }

    const carriages = await Carriage.findAll({
      where: { trip_id: tripId },
      attributes: ["id", "carriage_no"],
      transaction: t,
      raw: true,
    });
    if (!carriages.length) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Trip has no carriages configured" });
    }

    const carriageIds = carriages.map((c) => c.id);
    const seatCodes = items.map((it) => it.seat_code);

    const tripSeats = await TripSeat.findAll({
      where: {
        carriage_id: { [Op.in]: carriageIds },
        seat_code: seatCodes,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
      raw: true,
    });

    const seatMap = new Map();
    for (const s of tripSeats) {
      const arr = seatMap.get(s.seat_code) || [];
      arr.push(s);
      seatMap.set(s.seat_code, arr);
    }

    let total = 0;
    const seatPicked = [];

    for (const it of items) {
      const list = seatMap.get(it.seat_code) || [];
      const seat = list.find(
        (s) => s.status === "available" && !s.order_item_id
      );
      if (!seat) {
        await t.rollback();
        return res.status(400).json({
          message: `Seat ${it.seat_code} is not available`,
        });
      }

      const price = seat.price != null ? Number(seat.price) : 0;
      total += price;

      seatPicked.push({
        seat,
        price,
        passenger_id: it.passenger_id ?? null,
      });
    }

    const userId = req.user?.id ?? null;

    const order = await Order.create(
      {
        user_id: userId,
        status: "pending",
        total_amount: total,
      },
      { transaction: t }
    );

    const orderItemsPayload = seatPicked.map((sp) => ({
      order_id: order.id,
      trip_id: tripId,
      seat_code: sp.seat.seat_code,
      passenger_id: sp.passenger_id,
      price: sp.price,
      status: "active",
    }));

    const orderItems = await OrderItem.bulkCreate(orderItemsPayload, {
      transaction: t,
      returning: true,
    });

    const oiMap = new Map();
    for (const oi of orderItems) {
      oiMap.set(oi.seat_code, oi.id);
    }

    const now = new Date();
    for (const sp of seatPicked) {
      const orderItemId = oiMap.get(sp.seat.seat_code);
      await TripSeat.update(
        {
          order_item_id: orderItemId,
          sold_at: now,
          status: "sold",
        },
        {
          where: { id: sp.seat.id },
          transaction: t,
        }
      );
    }

    await t.commit();

    const resultItems = orderItems.map((oi) => ({
      id: oi.id,
      trip_id: oi.trip_id,
      seat_code: oi.seat_code,
      price: Number(oi.price),
      status: oi.status,
    }));

    return res.status(201).json({
      message: "Order created",
      order: {
        id: order.id,
        user_id: order.user_id,
        status: order.status,
        total_amount: Number(order.total_amount),
      },
      items: resultItems,
    });
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "createOrder failed", detail: e.message });
  }
};

// tuỳ bạn: admin list orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "phone"],
        },
      ],
      order: [["created_at", "DESC"]],
    });
    return res.json({ orders });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "getAllOrders failed", detail: e.message });
  }
};

export const getOrderDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "phone"],
        },
      ],
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.json({ order });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "getOrderDetail failed", detail: e.message });
  }
};
export async function getOrderMetrics(req, res) {
  try {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const wherePaid = { status: "paid" };
    if (from) wherePaid.created_at = { [Op.gte]: from };
    if (to) {
      wherePaid.created_at = {
        ...(wherePaid.created_at || {}),
        [Op.lt]: new Date(to.getTime() + 24 * 3600 * 1000),
      };
    }

    // KPI tổng
    const totals = await Order.findAll({
      where: wherePaid,
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("id")), "paid_orders"],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col("total_amount")),
            0
          ),
          "revenue",
        ],
      ],
      raw: true,
    });
    const kpi = totals?.[0] || { paid_orders: 0, revenue: 0 };

    // Seats sold (đếm OrderItem của các order paid)
    const seatsRow = await OrderItem.findAll({
      include: [
        { model: Order, as: "order", attributes: [], where: wherePaid },
      ],
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("OrderItem.id")), "seats"],
      ],
      raw: true,
    });
    const seats_sold = Number(seatsRow?.[0]?.seats || 0);

    // Daily series
    const daily = await Order.findAll({
      where: wherePaid,
      attributes: [
        [Sequelize.fn("DATE", Sequelize.col("created_at")), "date"],
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col("total_amount")),
            0
          ),
          "revenue",
        ],
        // đếm items trong ngày: sum of subquery counts
        [
          Sequelize.literal(`SUM((
          SELECT COUNT(oi.id)
          FROM OrderItems oi
          WHERE oi.order_id = \`Order\`.id
        ))`),
          "seats_of_order",
        ],
      ],
      group: [Sequelize.fn("DATE", Sequelize.col("created_at"))],
      raw: true,
    });

    // daily is already grouped by date
    const dailySeries = daily
      .map((row) => ({
        date: row.date,
        revenue: Number(row.revenue || 0),
        seats: Number(row.seats_of_order || 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      revenue: Number(kpi.revenue || 0),
      paid_orders: Number(kpi.paid_orders || 0),
      seats_sold,
      daily: dailySeries,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "metrics failed", detail: "ahsuib" + e.message });
  }
}
export default {
  previewOrder,
  createOrder,
  getAllOrders,
  getOrderDetail,
  getOrderMetrics,
};
