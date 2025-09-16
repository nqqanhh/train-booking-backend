'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SeatTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SeatTemplate.associate = (m) => {
        SeatTemplate.hasMany(m.SeatTemplateSeat, {
          foreignKey: "template_id",
          as: "seats",
          onDelete: "CASCADE",
        });
        SeatTemplate.hasMany(m.Trip, {
          foreignKey: "seat_template_id",
          as: "trips",
        });
      };
    }
  }
  SeatTemplate.init({
    name: DataTypes.STRING,
    meta_json: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'SeatTemplate',
  });
  return SeatTemplate;
};