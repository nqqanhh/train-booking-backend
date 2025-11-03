// src/controllers/payment.controller.js
import fetch from "node-fetch";
import db from "../models/index.js";
const { Order, OrderItem, Payment, Carriage, TripSeat, sequelize } = db;

const PP_BASE = process.env.PAYPAL_BASE || "https://api-m.sandbox.paypal.com";
const PP_CLIENT = process.env.PAYPAL_CLIENT_ID || "";
const PP_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";

async function getPayPalAccessToken() {
  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    // basic auth
    // @ts-ignore
    agent: undefined,
    // node-fetch auth:
    // eslint-disable-next-line no-useless-concat
    // NOTE: node-fetch v2 không có "auth" option, dùng header Authorization:
    // Nhưng PayPal cũng chấp nhận Basic base64(client:secret)
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${PP_CLIENT}:${PP_SECRET}`).toString("base64"),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`oauth fail ${res.status}: ${t}`);
  }
  const json = await res.json();
  return json.access_token;
}

// POST /payments/paypal/create   { order_id, return_url, cancel_url }
export const paypalCreate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { order_id, return_url, cancel_url } = req.body || {};
    if (!order_id) {
      await t.rollback();
      return res.status(400).json({ message: "order_id required" });
    }
    const order = await Order.findByPk(order_id, {
      include: [{ model: OrderItem, as: "items" }],
      transaction: t,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "pending") {
      await t.rollback();
      return res
        .status(409)
        .json({ message: `Order is ${order.status}, cannot create payment` });
    }

    const accessToken = await getPayPalAccessToken();

    // PayPal amount phải là string 2 chữ số thập phân (USD)
    const amount = Number(order.total_amount || 0).toFixed(2);

    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `order_${order.id}`,
          amount: { currency_code: "USD", value: amount },
        },
      ],
      application_context: {
        brand_name: "E-Train",
        user_action: "PAY_NOW",
        return_url: return_url || "https://example.com/return",
        cancel_url: cancel_url || "https://example.com/cancel",
      },
    };

    const r = await fetch(`${PP_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const json = await r.json();
    if (!r.ok) {
      await t.rollback();
      return res.status(400).json({ message: "paypal-create failed", detail: json });
    }

    const approvalLink =
      (json.links || []).find((l) => l.rel === "approve")?.href || null;

    // Lưu bản ghi Payment (pending)
    const pay = await Payment.create(
      {
        order_id: order.id,
        provider: "paypal",
        provider_order_id: json.id,
        status: "pending",
        amount: amount,
        raw_create: json,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "OK",
      paypal_order_id: json.id,
      approval_url: approvalLink,
      payment_id: pay.id,
    });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ message: "paypal-create error", detail: e.message });
  }
};

// POST /payments/paypal/capture   { order_id, paypal_order_id }
export const paypalCapture = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { order_id, paypal_order_id } = req.body || {};
    if (!order_id || !paypal_order_id) {
      await t.rollback();
      return res.status(400).json({ message: "order_id & paypal_order_id required" });
    }

    const order = await Order.findByPk(order_id, {
      include: [{ model: OrderItem, as: "items" }],
      transaction: t,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    // gọi capture PayPal
    const accessToken = await getPayPalAccessToken();
    const r = await fetch(`${PP_BASE}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const json = await r.json();

    if (!r.ok || json.status !== "COMPLETED") {
      await Payment.update(
        { status: "failed", raw_capture: json },
        { where: { order_id, provider_order_id: paypal_order_id }, transaction: t }
      );
      await t.rollback();
      return res.status(400).json({
        message: "paypal-capture failed",
        detail: json,
      });
    }

    // cập nhật Payment -> captured
    await Payment.update(
      { status: "captured", raw_capture: json },
      { where: { order_id, provider: "paypal", provider_order_id: paypal_order_id }, transaction: t }
    );

    // cập nhật Order -> paid
    await order.update({ status: "paid" }, { transaction: t });

    // ---- Lock seat (gắn order_item_id vào TripSeat) ----
    // Với thiết kế hiện tại: TripSeat không còn trip_id, chỉ có (carriage_id, seat_code, order_item_id)
    // => cần map các carriage thuộc trip của từng order item rồi update.
    // Gom theo trip_id trong items:
    const tripGroups = new Map();
    for (const it of order.items) {
      if (!tripGroups.has(it.trip_id)) tripGroups.set(it.trip_id, []);
      tripGroups.get(it.trip_id).push(it);
    }

    for (const [tripId, items] of tripGroups) {
      const carriages = await Carriage.findAll({
        where: { trip_id: tripId },
        attributes: ["id", "trip_id"],
        transaction: t,
        raw: true,
      });
      const carrIds = carriages.map((c) => c.id);
      if (!carrIds.length) continue;

      for (const it of items) {
        // gán order_item_id cho ghế tương ứng
        await TripSeat.update(
          { order_item_id: it.id }, // OrderItem.id
          {
            where: {
              carriage_id: { [db.Sequelize.Op.in]: carrIds },
              seat_code: it.seat_code,
              order_item_id: null,
            },
            transaction: t,
          }
        );
      }
    }

    await t.commit();
    return res.status(200).json({ message: "captured", order_id, paypal_order_id, status: "paid" });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ message: "paypal-capture error", detail: e.message });
  }
};
