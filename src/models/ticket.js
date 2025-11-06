"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Ticket extends Model {
    static associate(m) {
      Ticket.belongsTo(m.OrderItem, {
        foreignKey: "order_item_id",
        as: "order_item",
      });
    }
  }

  Ticket.init(
    {
      order_item_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
      qr_payload: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM("valid", "used", "refunded", "void"),
        allowNull: false,
        defaultValue: "valid",
      },
      refunded_at: DataTypes.DATE,
      refund_reason: DataTypes.STRING(255),
      issued_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "Ticket",
      tableName: "Tickets",
      timestamps: true,
      underscored: true, // <-- quan trọng
      createdAt: "created_at", // (tùy chọn) tường minh
      updatedAt: "updated_at", // (tùy chọn)
    }
  );

  return Ticket;
};
