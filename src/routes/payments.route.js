import { Router } from "express";
import {
  paypalCreate,
  paypalCapture,
} from "../controllers/payments.controller.js";

const paymentsRouter = Router();

paymentsRouter.post("/paypal/create-order", paypalCreate);
// paymentsRouter.get("/paypal/capture", paypalCapture);
paymentsRouter.post("/paypal/capture", paypalCapture);
export default paymentsRouter;
