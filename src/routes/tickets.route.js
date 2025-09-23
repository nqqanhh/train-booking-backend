import Router from "express";
import {
  listTicketsByOrder,
  validateTicket,
} from "../controllers/tickets.controller.js";

const ticketsRouter = Router();

ticketsRouter.post("/validate", validateTicket);
ticketsRouter.get("/by-order/:orderId", listTicketsByOrder);

export default ticketsRouter;
