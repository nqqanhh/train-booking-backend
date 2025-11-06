import { Router } from "express";
import {
  getAllRequests,
  sendSuportRequest,
} from "../controllers/supportresquest.controller.js";

const supportRequestRouter = Router();
// client
supportRequestRouter.post("/", sendSuportRequest);
// admin
supportRequestRouter.get("/", getAllRequests);
export default supportRequestRouter;
