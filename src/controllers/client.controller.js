import { buildSeatMapForTrip } from "../services/seatmap.service.js";
import tripController from "./trips.controller.js";
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

export const searchTripsForClient = async (req, res) => {
  // bạn có thể custom filter origin/destination ở đây,
  // hoặc dùng trực tiếp listTrips nếu FE đã pass đúng route_id + date.
  return tripController.listTrips(req, res);
};

// GET /client/trips/:id/seatmap
export const getTripSeatMapForClient = async (req, res) => {
  return tripController.getSeatMap(req, res);
};

// GET /client/carriages/:id/seatmap
export const getCarriageSeatMapForClient = async (req, res) => {
  return getCarriageSeatMap(req, res);
};
