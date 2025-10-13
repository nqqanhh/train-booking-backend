import { Router } from "express";
import routesController from "../controllers/routes.controller.js";

const routesRouter = Router();

routesRouter.get("/", routesController.getRoutes);
routesRouter.get("/one", routesController.getOneRoute);
routesRouter.get("/:routeId", routesController.getOneRouteById);
routesRouter.post("/create", routesController.createRoute);
routesRouter.post("/update/:routeId", routesController.updateRoute);
routesRouter.post("/delete/:routeId", routesController.deleteRoute);
export default routesRouter;
