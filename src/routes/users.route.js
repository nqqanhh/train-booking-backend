import { Router } from "express";
import userController from "../controllers/users.controller.js";

const usersRouter = Router();

usersRouter.get("/", userController.getMyProfile);
usersRouter.put("/edit-profile", userController.updateMyProfile);
usersRouter.put("/change-password", userController.changePassword);
export default usersRouter;
