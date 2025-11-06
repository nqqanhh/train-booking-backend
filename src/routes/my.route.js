import { Router } from "express";
import myController from "../controllers/my.controller.js";

const myRouter = Router();

myRouter.get("/orders", myController.getMyOrder);
myRouter.get("/ticket", myController.getMyTickets);
myRouter.get("/support-requests", myController.getMySupportRequest);
export default myRouter;
