import { Router } from "express";
import {
  getAllOrders,
  previewOrder,
  createOrder,
  getOrderMetrics,
  getOrderDetail,
} from "../controllers/orders.controller.js";
import { isOwnerOrAdmin } from "../middlewares/rbac.js";
import db from "../models/index.js";

const { Order } = db;

const ordersRouter = Router();

ordersRouter.get("/", getAllOrders);
ordersRouter.post("/preview", previewOrder);
ordersRouter.post("/", createOrder);
ordersRouter.get("/metrics", getOrderMetrics);
ordersRouter.get("/:id", getOrderDetail);
export default ordersRouter;
