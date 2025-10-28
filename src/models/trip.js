"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Trip extends Model {
    static associate(m) {
      Trip.hasMany(m.Carriage, {
        foreignKey: "trip_id",
        as: "carriages",
        onDelete: "CASCADE",
      });

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
      seat_template_id: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      sequelize,
      modelName: "Trip",
      tableName: "Trips",
      timestamps: true,
      underscored: true, // <-- quan trọng
      createdAt: "created_at", // (tùy chọn) tường minh
      updatedAt: "updated_at", // (tùy chọn)
    }
  );

  return Trip;
};
