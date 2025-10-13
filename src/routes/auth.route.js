import Router from "express";
import authController from "../controllers/auth.controller.js";
import otpController from "../controllers/otp.controller.js";
const authRouter = Router();
//signup
authRouter.post("/signup", authController.signUp);
//login
authRouter.post("/login", authController.login);
//
authRouter.post("/otp/request", otpController.requestOtp);
authRouter.post("/otp/verify", otpController.verifyOtpCode);
authRouter.post("/password/reset", otpController.resetPassword);
export default authRouter;
