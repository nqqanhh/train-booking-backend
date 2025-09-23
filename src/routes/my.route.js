import { Router } from "express";
import myController from "../controllers/my.controller.js";

const myRouter = Router();

myRouter.get("/orders", myController.getMyOrder);
myRouter.get("/ticket", myController.getMyTicket);

export default myRouter;
