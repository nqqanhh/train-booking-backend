// src/jobs/tripSchedules.cron.js
import cron from "node-cron";
import { generateUpcomingTrips } from "../services/tripschedules.service.js";

const TZ = "Asia/Ho_Chi_Minh";
let isRunning = false;

// chạy mỗi ngày lúc 02:00 (giờ VN)
cron.schedule(
  "0 2 * * *",
  async () => {
    if (isRunning) {
      console.log("[TripCron] previous run still in progress, skipping");
      return;
    }
    isRunning = true;
    const days = Number(process.env.TRIP_CRON_DAYS || 14);
    console.log(
      `[TripCron] start generateUpcomingTrips days=${days} @ ${new Date().toISOString()}`
    );
    try {
      const res = await generateUpcomingTrips({ days, nowTz: TZ });
      console.log(`[TripCron] generated trips: ${res.count}`);
    } catch (e) {
      console.error("[TripCron] ERROR:", e?.message || e);
    } finally {
      isRunning = false;
    }
  },
  { timezone: TZ }
);

// tùy chọn: chạy ngay khi khởi động (warm-up)
if (process.env.TRIP_CRON_RUN_ON_BOOT === "1") {
  (async () => {
    try {
      const days = Number(process.env.TRIP_CRON_DAYS || 7);
      const res = await generateUpcomingTrips({ days, nowTz: TZ });
      console.log(`[TripCron] boot-run generated trips: ${res.count}`);
    } catch (e) {
      console.error("[TripCron] boot-run ERROR:", e?.message || e);
    }
  })();
}

console.log("[TripCron] scheduled 02:00 daily, TZ=", TZ);
