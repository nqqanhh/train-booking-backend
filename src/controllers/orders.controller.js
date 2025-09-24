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
  const t = await sequelize.transaction();
  try {
    const user_id = req.user.id;
    const { trip_id, items = [] } = req.body || {};
    if (!trip_id || !items.length) {
      await t.rollback();
      return res.status(400).json({ message: "Missing trip_id/items" });
    }

    const { baseMap, soldSet } = await buildPriceMaps(trip_id);

    let total = 0;
    const rows = items.map((it) => {
      if (soldSet.has(it.seat_code))
        throw new Error(`Seat ${it.seat_code} already sold`);
      const price = baseMap.get(it.seat_code);
      if (price == null)
        throw new Error(`Seat ${it.seat_code} not found in template`);
      total += price;
      return {
        trip_id,
        seat_code: it.seat_code,
        passenger_id: it.passenger_id,
        price,
      };
    });

    const order = await Order.create(
      {
        user_id,
        status: "pending",
        total_amount: total,
      },
      { transaction: t }
    );

    await OrderItem.bulkCreate(
      rows.map((r) => ({ ...r, order_id: order.id })),
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({
      message: "Order created",
      order_id: order.id,
      total_amount: total,
    });
  } catch (e) {
    await t.rollback();
    res.status(400).json({ message: "Create order failed", detail: e.message });
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

    const order = await Order.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "phone"],
        },
        {
          model: OrderItem,
          as: "items",
          attributes: [
            {
              model: db.PassengerProfile,
              as: "passenger",
              attributes: ["id", "full_name", "id_no", "dob", "phone"],
            },
            {
              model: db.TripSeat,
              as: "trip_seat",
              attributes: ["id", "trip_id", "seat_code", "sold_at"],
            },
            {
              model: db.Ticket,
              as: "ticket",
              attributes: [
                "id",
                "qr_payload",
                "status",
                "issued_at",
                "used_at",
              ],
            },
          ],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "id",
            "provider",
            "provider_txn_id",
            "amount",
            "status",
            "created_at",
          ],
        },
      ],
    });
    if (!order)
      return res.status(404).json({
        message: "Order not found",
      });
    res.status(200).json({
      message: "OK",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "get order detail failed",
      detail: error.message,
    });
  }
};
const orderController = { previewOrder, createOrder, getOrderDetail, getAllOrders };

export default orderController;
