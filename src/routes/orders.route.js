import { Router } from "express";
import orderController from "../controllers/orders.controller.js";

const ordersRouter = Router();

ordersRouter.post("/preview", orderController.previewOrder);
ordersRouter.post("/", orderController.createOrder);

export default ordersRouter;
