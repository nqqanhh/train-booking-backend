import { Router } from "express";
import userController from "../controllers/users.controller.js";

const usersRouter = Router();

usersRouter.get("/", userController.getMyProfile);
usersRouter.post("/update", userController.updateMyProfile);
usersRouter.post("/change-password", userController.changePassword);
export default usersRouter;
