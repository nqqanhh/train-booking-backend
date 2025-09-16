'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Order.associate = (m) => {
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
      };
    }
  }
  Order.init({
    user_id: DataTypes.BIGINT,
    status: DataTypes.STRING,
    total_amount: DataTypes.DECIMAL,
    coupon_code: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};