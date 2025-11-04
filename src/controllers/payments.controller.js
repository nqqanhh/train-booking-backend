// src/controllers/payments.controller.js
import axios from "axios";
import db from "../models/index.js";
import { getPaypalToken, PP_BASE } from "../utils/paypal.js";
import { generateTickets } from "./tickets.controller.js";
import { ensureTripSeatsForTrip } from "../services/tripseat.service.js";

// Destructure tất cả model thực sự dùng
const { Order, Payment, OrderItem, Carriage, TripSeat } = db;

/** Tạo PayPal order */
export const paypalCreateOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { order_id, return_url, cancel_url } = req.body || {};
    if (!order_id || !return_url || !cancel_url) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "order_id, return_url, cancel_url required" });
    }

    // 1) Lấy order từ DB và kiểm tra trạng thái
    const order = await Order.findByPk(order_id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ message: "Order must be pending" });
    }

    // 2) Tổng tiền (đã tính ở backend khi createOrder)
    const valueStr = Number(order.total_amount || 0).toFixed(2);
    if (Number(valueStr) <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid order total" });
    }

    // 3) Gọi PayPal tạo order
    const accessToken = await getPaypalToken();
    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: String(order.id),
          amount: { currency_code: "USD", value: valueStr }, // luôn là string "xx.yy"
        },
      ],
      application_context: {
        return_url, // ex: https://your-domain.com/paypal/return?order_id=...
        cancel_url,
        brand_name: "Train Booking",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    };

    const resp = await axios.post(`${PP_BASE}/v2/checkout/orders`, body, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 20000,
    });

    const ppOrder = resp.data;
    const approval = ppOrder?.links?.find((l) => l.rel === "approve")?.href;

    // 4) Lưu Payment (initiated)
    await Payment.create(
      {
        order_id: order.id,
        provider: "paypal",
        provider_txn_id: ppOrder.id, // paypal_order_id
        amount: valueStr,
        status: "initiated",
        raw_payload: ppOrder,
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({ paypal_order_id: ppOrder.id, approval_url: approval });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      message: "create-order failed",
      detail: error?.response?.data || error.message,
    });
  }
};

/** Hoàn tất cập nhật DB sau khi PayPal xác nhận đã capture */
async function finalizePaidOrder({ order_id, amountValue, paypal_payload }, t) {
  const { Order, Payment, OrderItem, Carriage, TripSeat } = db;

  // Double-check order
  const order = await Order.findByPk(order_id, { transaction: t, raw: true });
  if (!order) throw new Error(`Order ${order_id} not found`);

  const amountStr = Number(amountValue || 0).toFixed(2);

  const pu = paypal_payload?.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  const txnId = cap?.id || paypal_payload?.id || `paypal-${Date.now()}`;

  // upsert payment
  let payment = await Payment.findOne({
    where: { order_id: order.id, provider: "paypal", provider_txn_id: txnId },
    transaction: t,
  });
  if (payment) {
    payment.status = "succeeded";
    payment.amount = amountStr;
    payment.raw_payload = paypal_payload;
    await payment.save({ transaction: t });
  } else {
    await Payment.create(
      {
        order_id: order.id,
        provider: "paypal",
        provider_txn_id: txnId,
        amount: amountStr,
        status: "succeeded",
        raw_payload: paypal_payload,
      },
      { transaction: t }
    );
  }

  await Order.update(
    { status: "paid", total_amount: amountStr },
    { where: { id: order.id }, transaction: t }
  );

  const items = await OrderItem.findAll({
    where: { order_id: order.id },
    attributes: ["id", "trip_id", "seat_code"],
    transaction: t,
    raw: true,
  });
  if (!items.length) return;

  const tripIds = [...new Set(items.map((i) => i.trip_id))];
  for (const tripId of tripIds) {
    await ensureTripSeatsForTrip(tripId, t); // không commit/rollback ở đây
  }

  const now = new Date();
  for (const it of items) {
    const cars = await Carriage.findAll({
      where: { trip_id: it.trip_id },
      attributes: ["id"],
      transaction: t,
      raw: true,
    });
    const carIds = cars.map((c) => c.id);
    if (!carIds.length) continue;

    await TripSeat.update(
      { order_item_id: it.id, sold_at: now, status: "sold" },
      {
        where: { carriage_id: carIds, seat_code: it.seat_code },
        transaction: t,
      }
    );
  }
}

/** Capture PayPal order (idempotent) */
// Trong paypalCapture:
export const paypalCapture = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const paypal_order_id =
      req.body?.paypal_order_id ||
      req.query?.paypal_order_id ||
      req.query?.token;
    const rawOrderId = req.body?.order_id ?? req.query?.order_id;

    // 👉 Chặn sớm: phải là số nguyên dương
    const orderIdNum = Number(rawOrderId);
    if (!paypal_order_id || !Number.isInteger(orderIdNum) || orderIdNum <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "paypal_order_id & valid order_id required" });
    }

    // 👉 Lấy order từ DB để dùng id “chuẩn”
    const order = await db.Order.findByPk(orderIdNum, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: `Order ${orderIdNum} not found` });
    }

    // Idempotency
    if (order.status === "paid") {
      await t.commit();
      return res.status(200).json({ message: "Order already paid" });
    }
    const okPay = await db.Payment.findOne({
      where: { order_id: order.id, provider: "paypal", status: "succeeded" },
      transaction: t,
    });
    if (okPay) {
      await db.Order.update(
        { status: "paid" },
        { where: { id: order.id }, transaction: t }
      );
      await t.commit();
      return res.status(200).json({ message: "Payment already captured" });
    }

    const accessToken = await getPaypalToken();

    try {
      const cap = await axios.post(
        `${PP_BASE}/v2/checkout/orders/${paypal_order_id}/capture`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20000 }
      );

      const pu = cap.data?.purchase_units?.[0];
      const capture = pu?.payments?.captures?.[0];
      const amountValue = capture?.amount?.value || pu?.amount?.value;

      // 👉 Truyền đúng order.id đã xác thực
      await finalizePaidOrder(
        { order_id: order.id, amountValue, paypal_payload: cap.data },
        t
      );
      await t.commit();

      try {
        await generateTickets(order.id);
      } catch (e) {
        console.error(
          "[TICKETS][GEN] failed",
          e?.name,
          e?.errors || e?.message
        );
        // middleware bắt lỗi chung hoặc ngay trong catch của controller
        if (
          e.name === "SequelizeValidationError" ||
          e.name === "SequelizeUniqueConstraintError"
        ) {
          return res.status(400).json({
            message: "Validation error",
            errors: e.errors?.map((er) => ({
              path: er.path,
              msg: er.message,
              value: er.value,
            })),
          });
        }
      }

      return res
        .status(200)
        .json({ message: "Payment captured successfully", paypal: cap.data });
    } catch (err) {
      const data = err.response?.data;
      if (data?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
        const od = await axios.get(
          `${PP_BASE}/v2/checkout/orders/${paypal_order_id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 15000,
          }
        );
        const pu = od.data?.purchase_units?.[0];
        const capture = pu?.payments?.captures?.[0];
        const amountValue = capture?.amount?.value || pu?.amount?.value;

        await finalizePaidOrder(
          { order_id: order.id, amountValue, paypal_payload: od.data },
          t
        );
        await t.commit();

        try {
          await generateTickets(order.id);
        } catch {}

        return res.status(200).json({
          message: "Order already captured (treated as success)",
          paypal: od.data,
        });
      }

      if (data?.details?.[0]?.issue === "INSTRUMENT_DECLINED") {
        const approval =
          data?.links?.find((l) => l.rel === "redirect")?.href ||
          `https://www.sandbox.paypal.com/checkoutnow?token=${paypal_order_id}`;
        await t.rollback();
        return res.status(409).json({
          message:
            "Payment method declined. Open approval_url to choose another funding source.",
          approval_url: approval,
          paypal: data,
        });
      }

      await t.rollback();
      return res
        .status(500)
        .json({ message: "capture failed", detail: data || err.message });
    }
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "capture failed", detail: e.message });
  }
};
