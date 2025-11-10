import Sequelize, { Op } from "sequelize";
import db from "../models/index.js";

const {
  sequelize,
  Trip,
  Carriage,
  TripSeat,
  SeatTemplateSeat,
  TripSeatPricing,
  Order,
  OrderItem,
  PassengerProfile,
  Payment,
} = db;

/**
 * Tính map giá và set ghế sold cho 1 trip
 */
const buildPriceMaps = async (trip_id) => {
  const trip = await Trip.findByPk(trip_id);
  if (!trip) throw new Error("Trip not found");

  // Lấy tất cả các Carriage của trip này
  const carriages = await Carriage.findAll({
    where: { trip_id },
    attributes: ["id", "seat_template_id"],
    raw: true,
  });
  if (!carriages.length) throw new Error(`Trip ${trip_id} has no carriages.`);

  // Lấy tất cả TripSeats trong các carriage này
  const carriageIds = carriages.map((c) => c.id);
  const soldSeats = await TripSeat.findAll({
    where: {
      carriage_id: { [Op.in]: carriageIds },
      order_item_id: { [Op.ne]: null },
    },
    attributes: ["seat_code"],
    raw: true,
  });

  // Lấy toàn bộ SeatTemplateSeat của tất cả template_id
  const templateIds = [...new Set(carriages.map((c) => c.seat_template_id))];
  const tplSeats = await SeatTemplateSeat.findAll({
    where: { template_id: { [Op.in]: templateIds } },
    raw: true,
  });

  // Map seat_code → base_price
  const baseMap = new Map(
    tplSeats.map((s) => [s.seat_code, Number(s.base_price)])
  );
  const soldSet = new Set(soldSeats.map((s) => s.seat_code));

  return { trip, baseMap, soldSet };
};

/**
 * Xem trước đơn hàng
 */
const previewOrder = async (req, res) => {
  try {
    const { trip_id, items = [] } = req.body || {};
    if (!trip_id || !items.length)
      return res.status(400).json({ message: "Missing trip_id/items" });
    const trip = await Trip.findOne({ trip_id });
    const departure_time = trip.departure_time;
    const { baseMap, soldSet } = await buildPriceMaps(trip_id);

    let total = 0;
    const details = items.map((it) => {
      if (soldSet.has(it.seat_code))
        throw new Error(`Seat ${it.seat_code} already sold`);
      const price = baseMap.get(it.seat_code);
      if (price == null)
        throw new Error(`Seat ${it.seat_code} not found in template`);
      const adjustedPrice = price;
      total += adjustedPrice;
      return {
        seat_code: it.seat_code,
        passenger_id: it.passenger_id,
        price: adjustedPrice,
      };
    });

    res.json({ trip_id, departure_time, items: details, total_amount: total });
  } catch (e) {
    res.status(400).json({ message: "Preview failed", detail: e.message });
  }
};

/**
 */
const createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { user_id, items = [] } = req.body || {};
    if (!user_id || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "user_id & items required" });
    }

    // Lấy danh sách trip_id từ items
    const tripIds = [...new Set(items.map((x) => x.trip_id))];

    // Kiểm tra tồn tại Trip
    const trips = await Trip.findAll({
      where: { id: tripIds },
      transaction: t,
      raw: true,
    });
    if (trips.length !== tripIds.length)
      throw new Error("Some trips not found");

    // Lấy Carriages thuộc các trip
    const carriages = await Carriage.findAll({
      where: { trip_id: { [Op.in]: tripIds } },
      attributes: ["id", "trip_id", "seat_template_id"],
      transaction: t,
      raw: true,
    });

    // Group Carriage theo trip_id
    const carrMap = new Map();
    for (const c of carriages) {
      if (!carrMap.has(c.trip_id)) carrMap.set(c.trip_id, []);
      carrMap.get(c.trip_id).push(c);
    }

    // Tính giá và kiểm tra ghế trống
    let total = 0;
    const orderItemsPayload = [];

    for (const it of items) {
      const carList = carrMap.get(it.trip_id);
      if (!carList?.length)
        throw new Error(`Trip ${it.trip_id} has no carriages`);

      // Tìm Carriage chứa seat_code đó
      const seatFound = await TripSeat.findOne({
        where: {
          carriage_id: { [Op.in]: carList.map((c) => c.id) },
          seat_code: it.seat_code,
        },
        raw: true,
        transaction: t,
      });
      if (!seatFound)
        throw new Error(`Seat ${it.seat_code} not found in any carriage`);
      if (seatFound.order_item_id)
        throw new Error(`Seat ${it.seat_code} already sold`);

      // Tính giá
      // Tìm carriage chứa seat_code cụ thể
      let carriageForSeat = null;
      for (const car of carList) {
        const seat = await TripSeat.findOne({
          where: { carriage_id: car.id, seat_code: it.seat_code },
          raw: true,
          transaction: t,
        });
        if (seat) {
          carriageForSeat = car;
          break;
        }
      }

      if (!carriageForSeat) {
        throw new Error(`Seat ${it.seat_code} not found in any carriage`);
      }

      const templateId = carriageForSeat.seat_template_id;
      let price = 0;
      const tplSeat = await SeatTemplateSeat.findOne({
        where: { template_id: templateId, seat_code: it.seat_code },
        raw: true,
        transaction: t,
      });
      price = Number(tplSeat?.base_price || 0) / 26000; // Convert VND to USD
      total += price;
      orderItemsPayload.push({
        trip_id: it.trip_id,
        seat_code: it.seat_code,
        passenger_id: it.passenger_id ?? null,
        price,
      });
    }

    // Tạo order
    const order = await Order.create(
      { user_id, status: "pending", total_amount: total.toFixed(2) },
      {
        fields: ["user_id", "status", "total_amount"], // ép chỉ 3 cột này
        // silent: true, // (không cần, nhưng nếu bạn có hook timestamps thì có thể bật)
      },
      { transaction: t }
    );

    // Tạo order items
    for (const oi of orderItemsPayload) {
      const created = await OrderItem.create(
        { ...oi, order_id: order.id },
        { transaction: t }
      );

      // Cập nhật TripSeat → gán order_item_id
      const carList = carrMap.get(oi.trip_id);
      await TripSeat.update(
        { order_item_id: created.id },
        {
          where: {
            carriage_id: { [Op.in]: carList.map((c) => c.id) },
            seat_code: oi.seat_code,
          },
          transaction: t,
        }
      );
    }

    await t.commit();
    res.status(201).json({
      message: "Order created",
      order_id: order.id,
      total_amount: total.toFixed(2),
      items: orderItemsPayload,
    });
  } catch (error) {
    await t.rollback();
    console.error("[createOrder SQL err]", {
      sqlMessage: error?.original?.sqlMessage,
      sql: error?.original?.sql,
      message: error.message,
    });
    return res.status(500).json({
      message: "create-order failed",
      detail: error?.message || String(error),
      sqlMsg: error?.original?.sqlMessage,
      sql: error?.original?.sql,
    });
  }
};
//admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll();
    res.status(200).json({
      message: "OK",
      orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "error " + error.message,
    });
  }
};
const getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          attributes: [
            "id",
            "order_id",
            "trip_id",
            "seat_code",
            "price",
            "created_at",
          ],
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
            },
          ],
          include: [
            {
              model: PassengerProfile,
              as: "passenger",
              attributes: ["full_name"],
            },
          ],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "id",
            "order_id",
            "provider",
            "provider_txn_id",
            "amount",
            "status",
            "raw_payload",
          ],
        },
      ],
    });
    if (!order) return res.status(404).json({ message: "order not found" });
    res.status(200).json({
      message: "OK",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "error " + error.message,
    });
  }
};

export async function listOrders(req, res) {
  const { status, from, to } = req.query;
  const where = {};
  if (status) where.status = status;
  if (from) where.created_at = { [Op.gte]: new Date(from) };
  if (to)
    where.created_at = {
      ...(where.created_at || {}),
      [Op.lt]: new Date(new Date(to).getTime() + 86400000),
    };

  const orders = await Order.findAll({
    where,
    include: [{ model: OrderItem, as: "items", attributes: ["id"] }],
    order: [["created_at", "ASC"]],
  });
  res.json({ items: orders });
}

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
