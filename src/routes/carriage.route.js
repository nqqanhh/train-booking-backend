// src/routes/carriages.routes.js
import express from "express";
import * as carriages from "../controllers/carriage.controller.js";
import authorizationToken from "../middlewares/auth.middleware.js";

const carriageRouter = express.Router();

// Carriages of a trip
carriageRouter.get(
  "/trips/:tripId/carriages",
  // authorizationToken,
  carriages.listCarriagesByTrip
);
carriageRouter.post(
  "/trips/:tripId/carriages",
  authorizationToken,
  carriages.createCarriage
);

// Seats per carriage
carriageRouter.get(
  "/:id/seats",
  // authorizationToken,
  carriages.listSeatsByCarriage
);
//
carriageRouter.get("/:id/seatmap", carriages.generateSeatsEndpoint); // seatmap đầy đủ cho 1 toa
// Generate seats for carriage from its seat_template
carriageRouter.post(
  "/:id/generate-seats",
  // authorizationToken,
  carriages.generateSeatsEndpoint
);

// (Optional) Seats for whole trip (all carriages)
carriageRouter.get(
  "/trips/:tripId/seats",
  authorizationToken,
  carriages.listSeatsByTrip
);

export default carriageRouter;
