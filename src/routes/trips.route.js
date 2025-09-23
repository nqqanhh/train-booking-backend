import { Router } from "express";
import tripController from "../controllers/trips.controller.js";

const tripsRouter = Router();

tripsRouter.get("/", tripController.getTrips);
tripsRouter.get("/:id/seatmap", tripController.getSeatMap);
tripsRouter.post("/:id/update",tripController.updateTrip)
tripsRouter.post("/create", tripController.createTrip);
export default tripsRouter;
