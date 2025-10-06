// src/services/tripSchedules.service.js
import dayjsBase from "dayjs";
import utc from "dayjs/plugin/utc.js";
import tz from "dayjs/plugin/timezone.js";
dayjsBase.extend(utc);
dayjsBase.extend(tz);

import db from "../models/index.js";
const { TripSchedule, Trip, Carriage, SeatTemplateSeat, TripSeat } = db;
const dayjs = (...a) => dayjsBase(...a);

function parseDOW(days_of_week) {
  if (!days_of_week) return [1, 2, 3, 4, 5, 6, 7];
  return String(days_of_week)
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => x >= 1 && x <= 7);
}
function withinDateRange(dateObj, start_date, end_date) {
  const d = dayjs(dateObj).startOf("day");
  const s = dayjs(start_date).startOf("day");
  if (d.isBefore(s)) return false;
  if (end_date && d.isAfter(dayjs(end_date).startOf("day"))) return false;
  return true;
}
function matchesFreq(dateObj, schedule) {
  if (schedule.freq === "daily") return true;
  const dow = dayjs(dateObj).isoWeekday(); // Mon=1..Sun=7
  const allow = parseDOW(schedule.days_of_week);
  return allow.includes(dow);
}
function isExcluded(dateObj, exceptions_json) {
  const dstr = dayjs(dateObj).format("YYYY-MM-DD");
  const skip = exceptions_json?.skip_dates || [];
  return skip.includes(dstr);
}
function overrideExtra(dateObj, exceptions_json) {
  const dstr = dayjs(dateObj).format("YYYY-MM-DD");
  const items = exceptions_json?.extra || [];
  return items.find((x) => x.date === dstr) || null;
}

async function generateSeatsForCarriage(carriage_id, t) {
  const car = await Carriage.findByPk(carriage_id, { transaction: t });
  if (!car) return;
  const tplSeats = await SeatTemplateSeat.findAll({
    where: { template_id: car.seat_template_id },
    transaction: t,
  });
  if (!tplSeats.length) return;

  const payload = tplSeats.map((s) => ({
    carriage_id: car.id,
    seat_code: s.seat_code,
    status: "available",
    // Nếu TripSeat có các cột sau thì mở comment:
    // pos_row: s.pos_row, pos_col: s.pos_col,
    // seat_class: s.seat_class, base_price: s.base_price,
  }));
  await TripSeat.bulkCreate(payload, {
    ignoreDuplicates: true,
    transaction: t,
  });
}

/** Sinh trips từ tất cả schedules active cho N ngày tới (idempotent) */
export async function generateUpcomingTrips({
  days = 14,
  nowTz = "Asia/Ho_Chi_Minh",
} = {}) {
  const t = await db.sequelize.transaction();
  try {
    const today = dayjs().tz(nowTz).startOf("day");
    const schedules = await TripSchedule.findAll({
      where: { status: "active" },
      transaction: t,
    });

    const createdTrips = [];

    for (const sch of schedules) {
      const tzName = sch.timezone || nowTz;
      for (let d = 0; d < days; d++) {
        const date = today.add(d, "day");
        if (!withinDateRange(date, sch.start_date, sch.end_date)) continue;
        if (isExcluded(date, sch.exceptions_json)) continue;
        if (!matchesFreq(date, sch)) continue;

        const extra = overrideExtra(date, sch.exceptions_json);
        const departHM = extra?.depart_hm || sch.depart_hm;
        const dep = dayjs.tz(
          `${date.format("YYYY-MM-DD")} ${departHM}`,
          tzName
        );
        const arr = dep.add(sch.eta_minutes, "minute");

        const [trip, created] = await Trip.findOrCreate({
          where: {
            route_id: sch.route_id,
            vehicle_no: sch.vehicle_no,
            departure_time: dep.toDate(),
          },
          defaults: {
            arrival_time: arr.toDate(),
            status: "active",
            seat_template_id: null,
          },
          transaction: t,
        });

        if (!created) continue;

        const defs = Array.isArray(sch.carriages_json)
          ? sch.carriages_json
          : [];
        for (const def of defs) {
          const car = await Carriage.create(
            {
              trip_id: trip.id,
              seat_template_id: def.seat_template_id,
              name: def.name || `Carriage ${def.carriage_no ?? ""}`.trim(),
              carriage_no: def.carriage_no || null,
            },
            { transaction: t }
          );
          await generateSeatsForCarriage(car.id, t);
        }

        createdTrips.push({
          trip_id: trip.id,
          route_id: sch.route_id,
          vehicle_no: sch.vehicle_no,
          departure_time: dep.toISOString(),
        });
      }
    }

    await t.commit();
    return { count: createdTrips.length, trips: createdTrips };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}
