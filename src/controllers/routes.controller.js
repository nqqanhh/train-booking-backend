import { where } from "sequelize";
import db from "../models/index.js";
const { Route } = db;

const isAuthorized = (req) => {
  const user = req.user;
  if (!user) {
    return false;
  }
  return true;
};

//===client===
const getRoutes = async (req, res) => {
  try {
    // const user = req.user;

    // if (!user) {
    //   return res.status(401).json({
    //     message: "Unauthorized",
    //   });
    // }
    const routeList = await Route.findAll();
    res.status(200).json({
      message: "Get routes successfully",
      items: routeList,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

const getOneRoute = async (req, res) => {
  try {
    const { destination, origin } = req.query;
    if (!destination || !origin) {
      return res.status(400).json({ message: "Missing destination or origin" });
    }
    const route = await Route.findOne({
      where: { destination: destination, origin: origin },
    });

    return res.status(200).json({ route: route });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

const getOneRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;
    if (!routeId) {
      return res.status(400).json({ message: "Missing routeId" });
    }
    const route = await Route.findOne({
      where: { id: routeId },
    });
    return res.status(200).json({ route: route });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};
//===admin===

//create
const createRoute = async (req, res) => {
  try {
    // const user = req.user;

    // if (!user) {
    //   return res.status(401).json({
    //     message: "Unauthorized",
    //   });
    // }

    const { origin, destination, eta_minutes, distance_km } = req.body;
    if (!origin || !destination || !eta_minutes || !distance_km) {
      return res.status(404).json({
        message: "Missing credentials",
      });
    }
    const newRoute = {
      origin: origin,
      destination: destination,
      eta_minutes: eta_minutes,
      distance_km: distance_km,
      active: true,
    };
    await Route.create(newRoute);
    res.status(200).json({
      message: "Create new route successfully",
      newRoute: newRoute,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

//update
const updateRoute = async (req, res) => {
  try {
    // const user = req.user;

    // if (!user) {
    //   return res.status(401).json({
    //     message: "Unauthorized",
    //   });
    // }
    const { routeId } = req.params;
    const { origin, destination, distance_km, eta_minutes, isActive } =
      req.body;
    const pickedRoute = await Route.findOne({ where: { id: routeId } });
    if (!pickedRoute) {
      return res.status(404).json({
        message: "Counldn't find this route",
      });
    }
    // Update route fields
    if (origin) pickedRoute.origin = origin;
    if (destination) pickedRoute.destination = destination;
    if (distance_km) pickedRoute.distance_km = distance_km;
    if (eta_minutes) pickedRoute.eta_minutes = eta_minutes;
    if (isActive !== undefined) pickedRoute.active = isActive;

    await Route.update(
      {
        origin: pickedRoute.origin,
        destination: pickedRoute.destination,
        distance_km: pickedRoute.distance_km,
        eta_minutes: pickedRoute.eta_minutes,
        active: pickedRoute.active,
      },
      {
        where: {
          id: pickedRoute.id,
        },
      }
    );
    res.status(200).json({
      message: `Update route ${pickedRoute.origin} - ${pickedRoute.destination} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

//delete route
const deleteRoute = async (req, res) => {
  try {
    // const user = req.user;

    // if (!user) {
    //   return res.status(401).json({
    //     message: "Unauthorized",
    //   });
    // }
    const { routeId } = req.params;
    const pickedRoute = await Route.findOne({ where: { id: routeId } });
    if (!pickedRoute) {
      return res.status(404).json({
        message: `This route doesn't exist`,
      });
    }
    await Route.destroy({
      where: {
        id: pickedRoute.id,
      },
    });
    res.status(200).json({
      message: `deleted route ${pickedRoute.origin} - ${pickedRoute.destination} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};
const routesController = {
  getRoutes,
  getOneRoute,
  createRoute,
  updateRoute,
  deleteRoute,
  getOneRouteById,
};
export default routesController;
