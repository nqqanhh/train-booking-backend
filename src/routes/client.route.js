import express from "express";
import {
  getCarriageSeatMapForClient,
  getClientTripSeatMap,
  getTripSeatMapForClient,
} from "../controllers/client.controller.js";

const clientRouter = express.Router();

// CHO CLIENT: lấy seatmap của toàn bộ trip (gọn, 1 call)
clientRouter.get("/trips/:id/seatmap", getTripSeatMapForClient);
clientRouter.get("/carriages/:id/seatmap", getCarriageSeatMapForClient);

export default clientRouter;
