"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(m) {
      OrderItem.belongsTo(m.Order, { foreignKey: "order_id", as: "order" });
      OrderItem.belongsTo(m.Trip, { foreignKey: "trip_id", as: "trip" });
      OrderItem.belongsTo(m.PassengerProfile, {
        foreignKey: "passenger_id",
        as: "passenger",
      });
      OrderItem.hasOne(m.Ticket, {
        foreignKey: "order_item_id",
        as: "ticket",
        onDelete: "CASCADE",
      });
      OrderItem.hasOne(m.TripSeat, {
        foreignKey: "order_item_id",
        as: "sold_seat",
        onDelete: "CASCADE",
      });
    }
  }

  OrderItem.init(
    {
      order_id: { type: DataTypes.BIGINT, allowNull: false },
      trip_id: { type: DataTypes.BIGINT, allowNull: false },
      seat_code: { type: DataTypes.STRING(32), allowNull: false },
      passenger_id: { type: DataTypes.BIGINT, allowNull: false },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      status: {
        type: DataTypes.ENUM("active", "refunded", "cancelled"),
        allowNull: false,
        defaultValue: "active",
      },
      refunded_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "OrderItem",
      tableName: "OrderItems",
      underscored: true,
      timestamps: true,
    }
  );

  return OrderItem;
};
