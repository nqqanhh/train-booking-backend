import { Router } from "express";
import {
  paypalCreateOrder,
  paypalCapture,
} from "../controllers/payments.controller.js";

const paymentsRouter = Router();

paymentsRouter.post("/paypal/create-order", paypalCreateOrder);
paymentsRouter.get("/capture", paypalCapture);
paymentsRouter.post("/paypal/capture", paypalCapture);
export default paymentsRouter;
