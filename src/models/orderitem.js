'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
     OrderItem.associate = (m) => {
       OrderItem.belongsTo(m.Order, {
         foreignKey: "order_id",
         as: "order",
         onDelete: "CASCADE",
       });
       OrderItem.belongsTo(m.TripSeat, {
         foreignKey: "trip_seat_id",
         as: "trip_seat",
       });
       OrderItem.hasOne(m.Ticket, {
         foreignKey: "order_item_id",
         as: "ticket",
         onDelete: "CASCADE",
       });
     };
    }
  }
  OrderItem.init({
    order_id: DataTypes.BIGINT,
    trip_seat_id: DataTypes.BIGINT,
    passenger_name: DataTypes.STRING,
    passenger_id_no: DataTypes.STRING,
    unit_price: DataTypes.DECIMAL,
    discount_amount: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'OrderItem',
  });
  return OrderItem;
};