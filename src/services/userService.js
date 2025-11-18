import db from "../models/index.js";

const { Trip, TripSeat, Carriage, Route } = db;
export const getUpcomingTrips = async () => {
  return db.Trip.findAll({
    where: {
      status: "Scheduled",
      date: {
        /* > now */
      },
    },
    include: [db.TripSeat, db.Carriage, db.Route],
  });
};
