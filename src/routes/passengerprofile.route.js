import { Router } from "express";
import passengerProfileController from "../controllers/passengerprofile.controller";

const passengerProfileRouter = Router();

passengerProfileRouter.get("/", passengerProfileController.getPassenger);
passengerProfileRouter.post(
  "/create",
  passengerProfileController.createPassengerProfile
);
passengerProfileRouter.post(
  "/update",
  passengerProfileController.updatePassengerProfile
);
passengerProfileRouter.post(
  "/delete",
  passengerProfileController.deletePassengerProfile
);

export default passengerProfileRouter;
