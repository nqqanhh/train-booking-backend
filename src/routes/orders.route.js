import { Router } from "express";
import orderController from "../controllers/orders.controller.js";
import { isOwnerOrAdmin } from "../middlewares/rbac.js";

const ordersRouter = Router();

ordersRouter.post("/preview", orderController.previewOrder);
ordersRouter.post("/", orderController.createOrder);
ordersRouter.get("/:id", isOwnerOrAdmin, orderController.getOrderDetail);
export default ordersRouter;
