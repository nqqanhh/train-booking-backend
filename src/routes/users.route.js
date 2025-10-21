// src/routes/users.route.js
import { Router } from "express";
import userController from "../controllers/users.controller.js";
import authorizationToken from "../middlewares/auth.middleware.js";

const usersRouter = Router();

usersRouter.get("/me", userController.getMyProfile, authorizationToken);
usersRouter.get("/users", userController.getAllUsers);
usersRouter.patch("/me", userController.updateMyProfile);
usersRouter.patch("/me/password", userController.changePassword);
export default usersRouter;
