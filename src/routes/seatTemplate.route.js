import { Router } from "express";
import seatTemplateController from "../controllers/seatTemplates.controller.js";
const seatTemplateRouter = Router();

seatTemplateRouter.get("/", seatTemplateController.getTemplateList);
seatTemplateRouter.get("/:id", seatTemplateController.getTemplateDetail);
seatTemplateRouter.post(
  "/create-template",
  seatTemplateController.createTemplate
);
seatTemplateRouter.post(
  "/update-template/:id",
  seatTemplateController.updateSeatTemplate
);
seatTemplateRouter.post(
  "/delete-template/:id",
  seatTemplateController.deleteTemplate
);
seatTemplateRouter.post(
  "/upsert-seats/:id/seats/upsert",
  seatTemplateController.upsertTemplateSeats
);
seatTemplateRouter.post(
  "/update-seat/:id/seats/:seatId",
  seatTemplateController.updateOneSeat
);
seatTemplateRouter.post(
  "/delete-seat/:id/seats/:seatId",
  seatTemplateController.deleteOneSeat
);

export default seatTemplateRouter;
