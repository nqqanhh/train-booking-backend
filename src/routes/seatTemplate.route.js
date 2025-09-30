// src/routes/seatTemplate.route.js
import { Router } from "express";
import seatTemplateController from "../controllers/seatTemplates.controller.js";

const seatTemplateRouter = Router();

// Read
seatTemplateRouter.get("/", seatTemplateController.getTemplateList);
seatTemplateRouter.get("/:id/seats", seatTemplateController.getTemplateDetail);

// Create / Update / Delete template
seatTemplateRouter.post("/", seatTemplateController.createTemplate);
seatTemplateRouter.patch("/:id", seatTemplateController.updateSeatTemplate);
seatTemplateRouter.delete("/:id", seatTemplateController.deleteTemplate);

// Seats within a template
seatTemplateRouter.post("/:id/seats", seatTemplateController.upsertTemplateSeats);
seatTemplateRouter.patch("/:id/seats/:seatId", seatTemplateController.updateOneSeat);
seatTemplateRouter.post("/:id/seats/:seatId", seatTemplateController.deleteOneSeat);

export default seatTemplateRouter;
