import { Router } from "express";
import orderController from "../controllers/orders.controller.js";
import { isOwnerOrAdmin } from "../middlewares/rbac.js";

const ordersRouter = Router();

ordersRouter.get("/", orderController.getAllOrders);
ordersRouter.post("/preview", orderController.previewOrder);
ordersRouter.post("/", orderController.createOrder);
ordersRouter.get("/:id", isOwnerOrAdmin, orderController.getOrderDetail);
export default ordersRouter;
