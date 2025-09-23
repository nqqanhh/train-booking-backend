"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class TripSeat extends Model {
    static associate(m) {
      TripSeat.belongsTo(m.Trip, { foreignKey: "trip_id", as: "trip" });
      TripSeat.belongsTo(m.OrderItem, {
        foreignKey: "order_item_id",
        as: "order_item",
      });
    }
  }

  TripSeat.init(
    {
      trip_id: { type: DataTypes.BIGINT, allowNull: false },
      seat_code: { type: DataTypes.STRING(32), allowNull: false },
      order_item_id: { type: DataTypes.BIGINT, allowNull: false },
      sold_at: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // true = active, false = refunded/cancelled
      },
      // Nếu bạn đã chọn boolean:
      // is_refunded:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: "TripSeat",
      tableName: "TripSeats",
      underscored: true,
      timestamps: false,
    }
  );

  return TripSeat;
};
