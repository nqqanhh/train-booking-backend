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
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "Route",
      tableName: "Routes",
      underscored: true,
      timestamps: true, // vì bạn đã có created_at/updated_at custom
    }
  );

  return Route;
};
