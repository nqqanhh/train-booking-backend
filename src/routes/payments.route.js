import { Router } from "express";
import {
  paypalCreateOrder,
  paypalCapture,
} from "../controllers/payments.controller.js";

const paymentsRouter = Router();

paymentsRouter.post("/paypal/create-order", paypalCreateOrder);
paymentsRouter.get("/paypal/capture", paypalCapture);
paymentsRouter.post("/paypal/capture", paypalCapture);
export default paymentsRouter;
