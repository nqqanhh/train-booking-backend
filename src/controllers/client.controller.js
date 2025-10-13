import { buildSeatMapForTrip } from "../services/seatmap.service.js";

export const getClientTripSeatMap = async (req, res) => {
  try {
    const tripId = Number(req.params.id);
    const seatmap = await buildSeatMapForTrip(tripId);
    if (!seatmap) return res.status(404).json({ message: "Trip not found" });

    // Gợi ý cache ngắn (tuỳ ý)
    res.set("Cache-Control", "public, max-age=15"); // 15s
    return res.json(seatmap);
  } catch (err) {
    console.error("getClientTripSeatMap error:", err);
    return res
      .status(500)
      .json({ message: "getTripSeatMap failed", detail: err.message });
  }
};
