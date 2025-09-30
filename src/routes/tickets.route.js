// src/routes/tickets.route.js
import { Router } from "express";
import {
  listTicketsByOrder,
  validateTicket,
  getAllTickets,
} from "../controllers/tickets.controller.js";

const ticketsRouter = Router();
ticketsRouter.post("/validate", validateTicket);
ticketsRouter.get("/by-order/:orderId", listTicketsByOrder);
ticketsRouter.get("/", getAllTickets);
export default ticketsRouter;
