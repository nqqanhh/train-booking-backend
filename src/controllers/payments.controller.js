import axios from "axios";
import db from "../../models/index.js";
import { getPaypalToken, PP_BASE } from "../utils/paypal.js";

export const paypalCreateOrder = async (req, res) => {
  try {
    const { order_id } = req.body || {};
    // cho phép client gửi return/cancel ở top-level hoặc trong application_context
    const return_url =
      req.body.return_url || req.body?.application_context?.return_url;
    const cancel_url =
      req.body.cancel_url || req.body?.application_context?.cancel_url;

    if (!order_id || !return_url || !cancel_url) {
      return res
        .status(400)
        .json({ message: "order_id, return_url, cancel_url required" });
    }

    const order = await db.Order.findByPk(order_id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending")
      return res.status(400).json({ message: "Order not pending" });

    const accessToken = await getPaypalToken();

    const value = Number(order.total_amount || 0).toFixed(2);
    if (Number(value) <= 0)
      return res.status(400).json({ message: "Order total must be > 0" });

    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: String(order.id),
          amount: { currency_code: "USD", value },
        },
      ],
      application_context: {
        return_url,
        cancel_url,
        brand_name: "Train Booking",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    };

    const resp = await axios.post(`${PP_BASE}/v2/checkout/orders`, body, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const ppOrder = resp.data;
    const approval = ppOrder.links.find((l) => l.rel === "approve")?.href;

    await db.Payment.create({
      order_id: order.id,
      provider: "paypal",
      provider_txn_id: ppOrder.id,
      amount: order.total_amount,
      status: "initiated",
      raw_payload: ppOrder,
    });

    res.json({ paypal_order_id: ppOrder.id, approval_url: approval });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "create-order failed",
        detail: error?.response?.data || error.message,
      });
  }
};


export const paypalCapture = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    // PayPal redirect (GET) ?token=xxx hoặc POST body { paypal_order_id }
    const paypal_order_id =
      req.body?.paypal_order_id ||
      req.query?.token ||
      req.query?.orderId ||
      req.query?.paypal_order_id;

    if (!paypal_order_id) {
      return res
        .status(400)
        .json({ message: "paypal_order_id (or ?token) required" });
    }

    // Lấy access token PayPal
    const accessToken = await getPaypalToken();

    // Gọi PayPal capture
    const cap = await axios.post(
      `${PP_BASE}/v2/checkout/orders/${paypal_order_id}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 20000,
      }
    );

    const captureData = cap.data;
    const purchaseUnit = captureData?.purchase_units?.[0];
    const amountValue = purchaseUnit?.payments?.captures?.[0]?.amount?.value;
    const currency =
      purchaseUnit?.payments?.captures?.[0]?.amount?.currency_code;

    // Update DB (ví dụ)
    const orderId = req.body?.order_id || req.query?.order_id; // truyền order_id của hệ thống bạn
    if (orderId) {
      await db.Payment.create(
        {
          order_id: orderId,
          provider: "paypal",
          provider_txn_id: paypal_order_id,
          amount: amountValue,
          status: "succeeded",
          raw_payload: captureData,
        },
        { transaction: t }
      );

      await db.Order.update(
        { status: "paid", total_amount: amountValue },
        { where: { id: orderId }, transaction: t }
      );
    }

    await t.commit();

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
