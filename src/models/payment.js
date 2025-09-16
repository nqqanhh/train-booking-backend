"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Payment.associate = (m) => {
        Payment.belongsTo(m.Order, {
          foreignKey: "order_id",
          as: "order",
          onDelete: "CASCADE",
        });
      };
    }
  }
  Payment.init(
    {
      order_id: DataTypes.BIGINT,
      provider: DataTypes.STRING,
      provider_txn_id: DataTypes.STRING,
      amount: DataTypes.DECIMAL,
      status: DataTypes.STRING,
      raw_payload: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: "Payment",
    }
  );
  return Payment;
};
