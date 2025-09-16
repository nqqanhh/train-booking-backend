'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TripSeat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TripSeat.associate = (m) => {
        TripSeat.belongsTo(m.Trip, {
          foreignKey: "trip_id",
          as: "trip",
          onDelete: "CASCADE",
        });
        TripSeat.hasOne(m.OrderItem, {
          foreignKey: "trip_seat_id",
          as: "order_item",
        });
      };
    }
  }
  TripSeat.init({
    trip_id: DataTypes.BIGINT,
    seat_code: DataTypes.STRING,
    seat_class: DataTypes.STRING,
    price: DataTypes.DECIMAL,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TripSeat',
  });
  return TripSeat;
};