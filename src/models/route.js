"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Route extends Model {
    static associate(m) {
      Route.hasMany(m.Trip, { foreignKey: "route_id", as: "trips" });
    }
  }

  Route.init(
    {
      origin: { type: DataTypes.STRING(255), allowNull: false },
      destination: { type: DataTypes.STRING(255), allowNull: false },
      distance_km: { type: DataTypes.DECIMAL(8, 2) },
      eta_minutes: { type: DataTypes.SMALLINT },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "Route",
      tableName: "Routes",
      timestamps: true,
      underscored: true, // <-- quan trọng
      createdAt: "created_at", // <— quan trọng
      updatedAt: "updated_at", // <— quan trọng
    }
  );

  return Route;
};
