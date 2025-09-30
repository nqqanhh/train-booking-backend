import { Op } from "sequelize";
import db from "../models/index.js";

const {
  sequelize,
  Trip,
  SeatTemplateSeat,
  TripSeat,
  Order,
  OrderItem,
  User,
  Payment,
  PassengerProfile,
  Ticket,
  Carriage,
  TripSeatPricing,
} = db;

const buildPriceMaps = async (trip_id) => {
  const trip = await Trip.findByPk(trip_id);
  if (!trip) throw new Error("Trip not found");

  const [tplSeats, sold] = await Promise.all([
    SeatTemplateSeat.findAll({
      where: { template_id: trip.seat_template_id },
      raw: true,
    }),
    TripSeat.findAll({
      where: { trip_id },
      attributes: ["seat_code"],
      raw: true,
    }),
  ]);
  const baseMap = new Map(
    tplSeats.map((s) => [s.seat_code, Number(s.base_price)])
  );
  const soldSet = new Set(sold.map((s) => s.seat_code));
  return { trip, baseMap, soldSet };
};

const previewOrder = async (req, res) => {
  try {
    const { trip_id, items = [] } = req.body || {};
    if (!trip_id || !items.length)
      return res.status(400).json({ message: "Missing trip_id/items" });

    const { baseMap, soldSet } = await buildPriceMaps(trip_id);

    let total = 0;
    const details = items.map((it) => {
      if (soldSet.has(it.seat_code))
        throw new Error(`Seat ${it.seat_code} already sold`);
      const price = baseMap.get(it.seat_code);
      if (price == null)
        throw new Error(`Seat ${it.seat_code} not found in template`);
      total += price;
      return { seat_code: it.seat_code, passenger_id: it.passenger_id, price };
    });

    res.json({ trip_id, items: details, total_amount: total });
  } catch (e) {
    res.status(400).json({ message: "Preview failed", detail: e.message });
  }
};

const createOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { user_id, items = [] } = req.body || {};

    if (!user_id || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "user_id & items required" });
    }

    // Validate dữ liệu đầu vào tối thiểu
    for (const it of items) {
      if (!it.trip_id || !it.seat_code) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: "Each item requires trip_id & seat_code" });
      }
      if (it.passenger_id) {
        const pp = await PassengerProfile.findByPk(it.passenger_id, {
          transaction: t,
        });
        if (!pp) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: `PassengerProfile ${it.passenger_id} not found` });
        }
      }
    }

    // Tập trip cần xử lý
    const tripIds = [...new Set(items.map((x) => x.trip_id))];

    // Lấy Trip (đồng thời lấy seat_template_id từ Trip)
    const trips = await Trip.findAll({
      where: { id: tripIds },
      transaction: t,
      raw: true,
    });
    if (trips.length !== tripIds.length) {
      await t.rollback();
      return res.status(404).json({ message: "Some trip(s) not found" });
    }
    const tripMap = new Map(trips.map((tr) => [tr.id, tr]));

    // Map trip_id -> [carriage_id]
    const carriages = await Carriage.findAll({
      where: { trip_id: tripIds },
      attributes: ["id", "trip_id"],
      transaction: t,
      raw: true,
    });
    const carrMap = new Map(); // trip_id -> [carriage_id]
    for (const c of carriages) {
      if (!carrMap.has(c.trip_id)) carrMap.set(c.trip_id, []);
      carrMap.get(c.trip_id).push(c.id);
    }
    for (const tripId of tripIds) {
      const list = carrMap.get(tripId) || [];
      if (!list.length) {
        await t.rollback();
        return res.status(409).json({
          message: `Trip ${tripId} has no carriage. Seed Carriages first.`,
        });
      }
    }

    // Tính giá & kiểm tra ghế trống
    let total = 0;
    const orderItemsPayload = [];

    for (const it of items) {
      const trip = tripMap.get(it.trip_id);
      const templateId = trip.seat_template_id;

      // 1) Ghế hợp lệ trong template?
      const tplSeat = await SeatTemplateSeat.findOne({
        where: { template_id: templateId, seat_code: it.seat_code },
        transaction: t,
        raw: true,
      });
      if (!tplSeat) {
        await t.rollback();
        return res.status(404).json({
          message: `Seat ${it.seat_code} not found in template of trip ${it.trip_id}`,
        });
      }

      // 2) Ghế còn trống? (chưa có order_item_id) — kiểm tra qua Carriage
      const carrIds = carrMap.get(it.trip_id);
      const locked = await TripSeat.findOne({
        where: {
          carriage_id: { [Op.in]: carrIds },
          seat_code: it.seat_code,
          order_item_id: { [Op.ne]: null },
        },
        attributes: ["id"],
        transaction: t,
      });
      if (locked) {
        await t.rollback();
        return res.status(409).json({
          message: `Seat ${it.seat_code} on trip ${it.trip_id} already sold`,
        });
      }

      // 3) Giá: ưu tiên TripSeatPricing (nếu có), fallback base_price của template
      let price = Number(tplSeat.base_price || 0);
      if (db.trip_seat_pricing) {
        const override = await TripSeatPricing.findOne({
          where: { trip_id: it.trip_id, seat_code: it.seat_code },
          attributes: ["price"],
          transaction: t,
          raw: true,
        });
        if (override?.price != null) price = Number(override.price);
      }
      if (!(price >= 0)) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: `Invalid price resolved for seat ${it.seat_code}` });
      }

      total += price;
      orderItemsPayload.push({
        trip_id: it.trip_id,
        seat_code: it.seat_code,
        passenger_id: it.passenger_id ?? null,
        price,
      });
    }

    // 4) Tạo Order với total_amount tính được
    const order = await Order.create(
      {
        user_id,
        status: "pending",
        total_amount: total.toFixed(2), // DECIMAL(12,2) — truyền string an toàn
      },
      { transaction: t }
    );

    // 5) Tạo OrderItems
    for (const oi of orderItemsPayload) {
      await OrderItem.create(
        { ...oi, order_id: order.id },
        {
          transaction: t,
          fields: ["order_id", "trip_id", "seat_code", "passenger_id", "price"],
        }
      );
    }

    await t.commit();
    return res.status(201).json({
      message: "Order created",
      order_id: order.id,
      total_amount: total.toFixed(2),
      items: orderItemsPayload,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      message: "create-order failed",
      detail: error?.message || String(error),
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const items = await Order.findAll();
    res.status(200).json({ message: "OK", items });
  } catch (error) {
    res.status(500).json({ message: "Internal error", detail: error.message });
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
          include: [{ model: Ticket, as: "ticket" }],
        },
        {
          model: Payment,
          as: "payments",
        },
      ],
      order: [
        [{ model: OrderItem, as: "items" }, "id", "ASC"],
        [{ model: Payment, as: "payments" }, "id", "ASC"],
      ],
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res.json(order);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to fetch order", detail: e.message });
  }
};
const orderController = {
  previewOrder,
  createOrder,
  getOrderDetail,
  getAllOrders,
};

export default orderController;
