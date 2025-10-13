import express from "express";
import { getClientTripSeatMap } from "../controllers/client.controller.js";

const clientRouter = express.Router();

// CHO CLIENT: lấy seatmap của toàn bộ trip (gọn, 1 call)
clientRouter.get("/trips/:id/seatmap", getClientTripSeatMap);

export default clientRouter;
