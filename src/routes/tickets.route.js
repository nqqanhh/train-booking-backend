// src/routes/tickets.route.js
import { Router } from "express";
import {
  listTicketsByOrder,
  validateTicket,
  getAllTickets,
  getTicketById,
  markUsed,
  adminRefundTicket,
  getTicketByQrPayload,
} from "../controllers/tickets.controller.js";
import { isAdmin } from "../middlewares/rbac.js";

const ticketsRouter = Router();
ticketsRouter.post("/:id/validate", validateTicket);
ticketsRouter.get("/by-order/:orderId", listTicketsByOrder);
ticketsRouter.get("/", getAllTickets);
ticketsRouter.get("/by-qr", getTicketByQrPayload);
ticketsRouter.get("/:id", getTicketById);
ticketsRouter.post("/:id/mark-used", markUsed);
ticketsRouter.post("/:id/refund", adminRefundTicket);
export default ticketsRouter;
