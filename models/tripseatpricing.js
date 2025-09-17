"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class TripSeatPricing extends Model {
    static associate(m) {
      TripSeatPricing.belongsTo(m.Trip, { foreignKey: "trip_id", as: "trip" });
    }
  }

  TripSeatPricing.init(
    {
      trip_id: { type: DataTypes.BIGINT, allowNull: false },
      seat_code: { type: DataTypes.STRING(32), allowNull: false },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    },
    {
      sequelize,
      modelName: "TripSeatPricing",
      tableName: "TripSeatPricing",
      underscored: true,
      timestamps: false,
    }
  );

  return TripSeatPricing;
};
