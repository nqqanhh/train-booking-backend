// src/routes/trips.route.js
import { Router } from "express";
import tripController from "../controllers/trips.controller.js";

const tripsRouter = Router();

// user
tripsRouter.get("/", tripController.getTrips);
tripsRouter.get("/:id/seatmap", tripController.getSeatMap);

// admin (REST chuẩn)
tripsRouter.post("/", tripController.createTrip);
tripsRouter.patch("/:id", tripController.updateTrip);
tripsRouter.delete("/:id", tripController.deleteTrip);

export default tripsRouter;
