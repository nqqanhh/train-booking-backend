import { Router } from "express";
import {
  createSchedule,
  generateFromSchedule,
  getSchedule,
  listSchedules,
  updateSchedule,
} from "../controllers/tripschedule.controller.js";

const TripScheduleRouter = Router();

TripScheduleRouter.get("/", listSchedules);
TripScheduleRouter.post("/", createSchedule);
TripScheduleRouter.get("/:id", getSchedule);
TripScheduleRouter.put("/:id", updateSchedule);
TripScheduleRouter.post("/:id/generate", generateFromSchedule);

export default TripScheduleRouter;
    