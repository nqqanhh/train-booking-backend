"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class TripSeat extends Model {
    static associate(m) {
      TripSeat.belongsTo(m.Carriage, {
        foreignKey: "carriage_id",
        as: "carriage",
      });
      TripSeat.belongsTo(m.OrderItem, {
        foreignKey: "order_item_id",
        as: "order_item",
      });
    }
  }

  TripSeat.init(
    {
      carriage_id: { type: DataTypes.BIGINT, allowNull: false }, // thay trip_id
      seat_code: { type: DataTypes.STRING(32), allowNull: false },
      // nếu có sold_at / order_item_id thì giữ nguyên
      order_item_id: { type: DataTypes.BIGINT },
      sold_at: { type: DataTypes.DATE },
      status: {
        type: DataTypes.ENUM(
          "available",
          "held",
          "sold",
          "refunded",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "available",
      },
    },
    {
      sequelize,
      modelName: "TripSeat",
      tableName: "TripSeats",
      timestamps: true,
      underscored: true, // <-- quan trọng
      createdAt: "created_at", // (tùy chọn) tường minh
      updatedAt: "updated_at", // (tùy chọn)
      indexes: [
        { unique: true, fields: ["carriage_id", "seat_code"] },
        { fields: ["order_item_id"] },
      ],
      defaultScope: {
        attributes: { exclude: ["trip_id"] },
      },
    }
  );

  return TripSeat;
};
