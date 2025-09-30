// src/services/tripseats.service.js
import db from "../models/index.js";
const { Carriage, SeatTemplateSeat, TripSeat } = db;

export async function ensureTripSeatsForTrip(trip_id, t) {
  const carriages = await Carriage.findAll({
    where: { trip_id },
    attributes: ["id", "seat_template_id"],
    transaction: t,
    raw: true,
  });
  if (!carriages.length) return;

  const tplIds = [...new Set(carriages.map((c) => c.seat_template_id))];
  const tplSeats = await SeatTemplateSeat.findAll({
    where: { template_id: tplIds },
    attributes: ["template_id", "seat_code"],
    transaction: t,
    raw: true,
  });

  const byTpl = new Map();
  for (const s of tplSeats) {
    if (!byTpl.has(s.template_id)) byTpl.set(s.template_id, []);
    byTpl.get(s.template_id).push(s.seat_code);
  }

  const now = new Date();
  const rows = [];
  for (const c of carriages) {
    const codes = byTpl.get(c.seat_template_id) || [];
    for (const code of codes) {
      rows.push({
        carriage_id: c.id,
        seat_code: code,
        status: "available", // ENUM hoặc mapping INT tuỳ DB bạn
        created_at: now,
        updated_at: now,
      });
    }
  }

  if (rows.length) {
    await TripSeat.bulkCreate(rows, {
      transaction: t,
      ignoreDuplicates: true, // cần unique (carriage_id, seat_code)
    });
  }
}
