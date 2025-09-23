import axios from "axios";
import db from "../models/index.js";
import { getPaypalToken, PP_BASE } from "../utils/paypal.js";
import { generateTickets } from "./tickets.controller.js";

export const paypalCreateOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { order_id, return_url, cancel_url } = req.body || {};
    if (!order_id || !return_url || !cancel_url) {
      return res
        .status(400)
        .json({ message: "order_id, return_url, cancel_url required" });
    }

    // 1) Lấy order từ DB và kiểm tra trạng thái
    const order = await db.Order.findByPk(order_id, { transaction: t });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order must be pending" });
    }

    // 2) Tính tiền (ví dụ dùng trường total_amount đã tính trước)
    const value = Number(order.total_amount || 0).toFixed(2);
    if (Number(value) <= 0)
      return res.status(400).json({ message: "Invalid order total" });

    // 3) Gọi PayPal tạo order
    const accessToken = await getPaypalToken();
    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: String(order.id),
          amount: { currency_code: "VND", value }, // luôn là string
        },
      ],
      application_context: {
        return_url, //  http://localhost:9000/api/payments/paypal/capture
        cancel_url, //  http://localhost:9000/api/payments/paypal/cancel
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
    const approval = ppOrder.links.find((l) => l.rel === "approve")?.href;

    // 4) Lưu mapping nội bộ :
    await db.Payment.create(
      {
        order_id: order.id,
        provider: "paypal",
        provider_txn_id: ppOrder.id, // paypal_order_id
        amount: value,
        status: "initiated",
        raw_payload: ppOrder,
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      paypal_order_id: ppOrder.id,
      approval_url: approval,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      message: "create-order failed",
      detail: error?.response?.data || error.message,
    });
  }
};

export const paypalCapture = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    // 1) Lấy paypal_order_id và order_id
    const paypal_order_id =
      req.body?.paypal_order_id ||
      req.query?.token ||
      req.query?.paypal_order_id ||
      req.query?.orderId;
    const orderId = req.body?.order_id || req.query?.order_id;

    if (!paypal_order_id || !orderId) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "paypal_order_id and order_id required" });
    }

    // 2) Lấy order, đảm bảo còn pending
    const order = await db.Order.findByPk(orderId, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "pending") {
      // idempotent: nếu đã paid thì coi như thành công
      if (order.status === "paid") {
        await t.commit();
        return res.json({ message: "Order already paid" });
      }
      await t.rollback();
      return res
        .status(400)
        .json({ message: `Invalid order status: ${order.status}` });
    }

    // 3) Capture PayPal
    const accessToken = await getPaypalToken();
    const cap = await axios.post(
      `${PP_BASE}/v2/checkout/orders/${paypal_order_id}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20000 }
    );

    const captureData = cap.data;
    const purchaseUnit = captureData?.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const amountValue = capture?.amount?.value;

    // 4) Update Payment -> succeeded (tìm theo provider_txn_id đã tạo lúc create)
    await db.Payment.update(
      {
        status: "succeeded",
        raw_payload: captureData,
        amount: amountValue,
      },
      {
        where: {
          provider: "paypal",
          provider_txn_id: paypal_order_id,
          order_id: orderId,
        },
        transaction: t,
      }
    );

    // 5) Update Order -> paid
    await db.Order.update(
      { status: "paid", total_amount: amountValue },
      { where: { id: orderId }, transaction: t }
    );

    await t.commit();

    // 6) Sinh Tickets + TripSeats (ngoài transaction thanh toán; hoặc truyền t nếu muốn chung tx)
    await generateTickets(orderId);

    return res.status(200).json({
      message: "Payment captured successfully",
      paypal: captureData,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      message: "capture failed",
      detail: error?.response?.data || error.message,
    });
  }
};

export const refundOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { order_id, capture_id, amount } = req.body; // amount optional (full refund nếu không truyền)
    if (!order_id || !capture_id)
      return res.status(400).json({ message: "order_id, capture_id required" });

    const token = await getPayPalToken();
    const body = amount
      ? { amount: { currency_code: "USD", value: Number(amount).toFixed(2) } }
      : {};
    const r = await axios.post(
      `${PP_BASE}/v2/payments/captures/${capture_id}/refund`,
      body,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // cập nhật DB
    await db.Payment.update(
      { status: "refunded" },
      { where: { order_id, provider: "paypal" }, transaction: t }
    );
    await db.Ticket.update(
      { status: "refunded" },
      {
        where: {
          order_item_id: (
            await db.OrderItem.findAll({
              attributes: ["id"],
              where: { order_id },
              transaction: t,
            })
          ).map((x) => x.id),
        },
        transaction: t,
      }
    );
    await db.TripSeat.destroy({
      where: {
        order_item_id: (
          await db.OrderItem.findAll({
            attributes: ["id"],
            where: { order_id },
            transaction: t,
          })
        ).map((x) => x.id),
      },
      transaction: t,
    });

    await db.Order.update(
      { status: "refunded" },
      { where: { id: order_id }, transaction: t }
    );

    await t.commit();
    return res.json({ message: "refunded", paypal: r.data });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      message: "refund failed ",
      details: error.response?.data || error.message,
    });
  }
};
