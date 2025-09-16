'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Trip extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Trip.associate = (m) => {
        Trip.belongsTo(m.Route, { foreignKey: "route_id", as: "route" });
        Trip.belongsTo(m.SeatTemplate, {
          foreignKey: "seat_template_id",
          as: "seat_template",
        });
        Trip.hasMany(m.TripSeat, {
          foreignKey: "trip_id",
          as: "seats",
          onDelete: "CASCADE",
        });
      };
    }
  }
  Trip.init({
    route_id: DataTypes.BIGINT,
    departure_time: DataTypes.DATE,
    arrival_time: DataTypes.DATE,
    vehicle_no: DataTypes.STRING,
    status: DataTypes.STRING,
    seat_template_id: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'Trip',
  });
  return Trip;
};