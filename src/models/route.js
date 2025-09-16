'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Route extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Route.associate = (m) => {
        Route.hasMany(m.Trip, { foreignKey: "route_id", as: "trips" });
      };
    }
  }
  Route.init({
    origin: DataTypes.STRING,
    destination: DataTypes.STRING,
    distance_km: DataTypes.DECIMAL,
    eta_minutes: DataTypes.SMALLINT,
    active: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Route',
  });
  return Route;
};