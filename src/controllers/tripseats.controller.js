// src/controllers/tripseats.controller.js
import db from "../models/index.js";
const { TripSeat } = db;

// GET /trip-seats/by-carriage/:carriageId
export const listByCarriage = async (req, res) => {
  try {
    const { carriageId } = req.params;
    const items = await TripSeat.findAll({
      where: { carriage_id: carriageId },
      order: [["seat_code", "ASC"]],
    });
    return res.json({ items });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: e.message });
  }
};

// PATCH /trip-seats/:id  — giới hạn field hợp lệ (không đổi seat_code tuỳ tiện)
export const updateOne = async (req, res) => {
  try {
    const { id } = req.params;
    const patch = {};
    if (typeof req.body?.order_item_id !== "undefined")
      patch.order_item_id = req.body.order_item_id;
    if (typeof req.body?.sold_at !== "undefined")
      patch.sold_at = req.body.sold_at;
    // nếu bạn đã nâng cấp status ENUM thì mở dòng dưới
    if (typeof req.body?.status !== "undefined") patch.status = req.body.status;

    const [count] = await TripSeat.update(patch, { where: { id } });
    if (!count) return res.status(404).json({ message: "Seat not found" });

    const seat = await TripSeat.findByPk(id);
    return res.json({ message: "Seat updated", seat });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Internal error", detail: e.message });
  }
};
