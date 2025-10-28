"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(m) {
      Payment.belongsTo(m.Order, { foreignKey: "order_id", as: "order" });
    }
  }

  Payment.init(
    {
      order_id: { type: DataTypes.BIGINT, allowNull: false },
      provider: { type: DataTypes.STRING(64), allowNull: false },
      provider_txn_id: { type: DataTypes.STRING(128) },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      status: {
        type: DataTypes.ENUM("initiated", "succeeded", "failed", "refunded"),
        allowNull: false,
      },
      raw_payload: { type: DataTypes.JSON },
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "Payments",
      timestamps: true,
      underscored: true, // <-- quan trọng
      createdAt: "created_at", // (tùy chọn) tường minh
      updatedAt: "updated_at", // (tùy chọn)
    }
  );

  return Payment;
};
