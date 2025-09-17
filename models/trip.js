"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Trip extends Model {
    static associate(m) {
      Trip.belongsTo(m.Route, { foreignKey: "route_id", as: "route" });
      Trip.belongsTo(m.SeatTemplate, {
        foreignKey: "seat_template_id",
        as: "seat_template",
      });
      Trip.hasMany(m.OrderItem, { foreignKey: "trip_id", as: "order_items" });
      Trip.hasMany(m.TripSeatPricing, {
        foreignKey: "trip_id",
        as: "pricing",
        onDelete: "CASCADE",
      });
      Trip.hasMany(m.TripSeat, {
        foreignKey: "trip_id",
        as: "sold_seats",
        onDelete: "CASCADE",
      });
    }
  }

  Trip.init(
    {
      route_id: { type: DataTypes.BIGINT, allowNull: false },
      departure_time: { type: DataTypes.DATE, allowNull: false },
      arrival_time: { type: DataTypes.DATE },
      vehicle_no: { type: DataTypes.STRING(64) },
      status: {
        type: DataTypes.ENUM("scheduled", "closed", "cancelled", "completed"),
        allowNull: false,
        defaultValue: "scheduled",
      },
      seat_template_id: { type: DataTypes.BIGINT, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "Trip",
      tableName: "Trips",
      underscored: true,
      timestamps: false,
    }
  );

  return Trip;
};
