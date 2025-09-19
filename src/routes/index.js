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
router.use("/support-requests", authorizationToken, supportRequestRouter);
router.use("/profile", authorizationToken, usersRouter);
router.use("/trips", authorizationToken, tripsRouter);
router.use("/tripseats", authorizationToken, tripSeatsRouter);
router.use("/tickets",authorizationToken, ticketsRouter);
router.use("/payments", authorizationToken, paymentsRouter);
router.use("/orders", authorizationToken, ordersRouter);
router.use("/notifications", authorizationToken, notificationsRouter);
router.use("/routes", authorizationToken, routesRouter);
router.use("passenger-profile", authorizationToken, passengerProfileRouter);
//

export default router;
