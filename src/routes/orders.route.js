import { Router } from "express";
import orderController from "../controllers/orders.controller.js";
import { isOwnerOrAdmin } from "../middlewares/rbac.js";
import db from "../models/index.js";

const { Order } = db;

const ordersRouter = Router();

// ordersRouter.get("/", orderController.getAllOrders);
ordersRouter.post("/preview", orderController.previewOrder);
ordersRouter.post("/", orderController.createOrder);
// ordersRouter.get("/:id", orderController.getOrderDetail);
export default ordersRouter;
