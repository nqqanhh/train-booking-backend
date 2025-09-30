// src/routes/tripseats.route.js
import { Router } from "express";
import {
  listByCarriage,
  updateOne,
} from "../controllers/tripseats.controller.js";

const tripSeatsRouter = Router();

tripSeatsRouter.get("/by-carriage/:carriageId", listByCarriage);
tripSeatsRouter.patch("/:id", updateOne);

export default tripSeatsRouter;
