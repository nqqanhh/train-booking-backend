import Router from "express";
import authController from "../controllers/auth.controller.js";
const authRouter = Router();
//signup
authRouter.post("/signup", authController.signUp);
//login
authRouter.post("/login", authController.login);
//
export default authRouter;
