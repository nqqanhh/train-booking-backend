// src/routes/trips.route.js
import { Router } from "express";
import tripController from "../controllers/trips.controller.js";

const tripsRouter = Router();

// user
tripsRouter.get("/list", tripController.listTrips);
tripsRouter.get("/:id/seatmap", tripController.getSeatMap);
tripsRouter.post("/:id/generate-seats", tripController.generateSeatsForTrip);

// admin (REST chuẩn)
tripsRouter.get("/", tripController.getTrips);
tripsRouter.post("/", tripController.createTrip);
tripsRouter.patch("/:id", tripController.updateTrip);
tripsRouter.delete("/:id", tripController.deleteTrip);
export default tripsRouter;
