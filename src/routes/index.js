import { Router } from "express";

import authRouter from "./auth.route.js";
import couponsRouter from "./coupons.route.js";
import supportRequestRouter from "./supportrequest.route.js";
import usersRouter from "./users.route.js";
import tripsRouter from "./trips.route.js";
import tripSeatsRouter from "./tripseats.route.js";
import ticketsRouter from "./tickets.route.js";
import paymentsRouter from "./payments.route.js";
import ordersRouter from "./orders.route.js";
import notificationsRouter from "./notification.route.js";
import routesRouter from "./routes.route.js";
import passengerProfileRouter from "./passengerprofile.route.js";
import authorizationToken from "../middlewares/auth.middleware.js";
const router = Router();
//
router.get("/", (req, res) => {
  res.json({ message: "API is running" });
});
//
router.use("/auth", authRouter);
router.use("/coupons", couponsRouter);
router.use("/support-requests", supportRequestRouter);
router.use("/profile", authorizationToken, usersRouter);
router.use("/trips", tripsRouter);
router.use("/tripseats", tripSeatsRouter);
router.use("/tickets", ticketsRouter);
router.use("/payments", paymentsRouter);
router.use("/orders", ordersRouter);
router.use("/notifications", notificationsRouter);
router.use("/routes", routesRouter);
router.use("passenger-profile", passengerProfileRouter);
//

export default router;
