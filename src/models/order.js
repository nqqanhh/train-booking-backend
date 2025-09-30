"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(m) {
      Order.belongsTo(m.User, { foreignKey: "user_id", as: "user" });
      Order.hasMany(m.OrderItem, {
        foreignKey: "order_id",
        as: "items",
        onDelete: "CASCADE",
      });
      Order.hasMany(m.Payment, {
        foreignKey: "order_id",
        as: "payments",
        onDelete: "CASCADE",
      });
    }
  }

  Order.init(
    {
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "paid",
          "cancelled",
          "refunded",
          "failed"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Order",
      tableName: "Orders",
      timestamps: true, // sẽ dùng createdAt/updatedAt
      underscored: true, // 👈 BẮT BUỘC camelCase
      createdAt: "createdAt", // (tường minh, để khỏi lệch)
      updatedAt: "updatedAt",
    }
  );

  return Order;
};
