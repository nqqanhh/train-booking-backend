// src/services/seatmap.service.js
import db from "../models/index.js";
const { Trip, Carriage, SeatTemplate, TripSeat } = db;

function parseMeta(m) {
  if (!m) return null;
  if (typeof m === "string") {
    try {
      return JSON.parse(m);
    } catch {
      return null;
    }
  }
  return m;
}
function inferLayoutFromSeatCodes(seats /* array of {seat_code} */) {
  let rows = 0,
    cols = 0;
  for (const s of seats || []) {
    const m = String(s.seat_code).match(/^(\d+)([A-Z])$/i);
    if (m) {
      rows = Math.max(rows, Number(m[1]));
      cols = Math.max(cols, m[2].toUpperCase().charCodeAt(0) - 64);
    }
  }
  return { rows, cols, blocks: [] };
}

// Trả seatmap cho 1 trip, payload tinh gọn: mỗi toa gồm layout + seats (seat_code + status)
export async function buildSeatMapForTrip(tripId) {
  const trip = await Trip.findByPk(tripId, {
    attributes: [
      "id",
      "route_id",
      "departure_time",
      "arrival_time",
      "vehicle_no",
      "status",
    ],
    raw: true,
  });
  if (!trip) return null;

  const carriages = await Carriage.findAll({
    where: { trip_id: tripId },
    attributes: ["id", "name", "carriage_no", "seat_template_id"],
    include: [
      {
        model: SeatTemplate,
        as: "seat_template",
        attributes: ["id", "name", "meta_json"],
      },
    ],
    order: [["carriage_no", "ASC"]],
  });

  const carriageIds = carriages.map((c) => c.id);
  const tripSeats = carriageIds.length
    ? await TripSeat.findAll({
        where: { carriage_id: carriageIds },
        attributes: ["carriage_id", "seat_code", "order_item_id", "status"],
        raw: true,
      })
    : [];

  // group seats theo carriage_id
  const seatByCarr = new Map();
  for (const ts of tripSeats) {
    if (!seatByCarr.has(ts.carriage_id)) seatByCarr.set(ts.carriage_id, []);
    seatByCarr.get(ts.carriage_id).push({
      seat_code: ts.seat_code,
      status: ts.status || (ts.order_item_id ? "sold" : "available"),
    });
  }

  return {
    trip,
    carriages: carriages.map((c) => {
      const seats = seatByCarr.get(c.id) || [];
      // 1) lấy layout từ template meta_json
      let layout = parseMeta(c?.seatTemplate?.meta_json) || {
        rows: 0,
        cols: 0,
        blocks: [],
      };
      // 2) nếu thiếu rows/cols thì suy từ seat_code
      if (!layout.rows || !layout.cols) {
        const inferred = inferLayoutFromSeatCodes(seats);
        if (inferred.rows && inferred.cols) layout = inferred;
      }
      return {
        id: c.id,
        name: c.name || `Toa ${c.carriage_no}`,
        carriage_no: c.carriage_no,
        layout,
        seats,
      };
    }),
  };
}
