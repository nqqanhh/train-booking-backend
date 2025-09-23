import { Router } from "express";
import passengerProfileController from "../controllers/passengerprofile.controller.js";

const passengerProfileRouter = Router();

passengerProfileRouter.get("/", passengerProfileController.getPassenger);
passengerProfileRouter.post(
  "/create",
  passengerProfileController.createPassengerProfile
);
passengerProfileRouter.post(
  "/update/:passengerProfileId",
  passengerProfileController.updatePassengerProfile
);
passengerProfileRouter.post(
  "/delete/:passengerProfileId",
  passengerProfileController.deletePassengerProfile
);

export default passengerProfileRouter;
