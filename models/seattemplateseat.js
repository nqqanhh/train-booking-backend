'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SeatTemplateSeat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SeatTemplateSeat.associate = (m) => {
        SeatTemplateSeat.belongsTo(m.SeatTemplate, {
          foreignKey: "template_id",
          as: "template",
          onDelete: "CASCADE",
        });
      };
    }
  }
  SeatTemplateSeat.init({
    template_id: DataTypes.BIGINT,
    seat_code: DataTypes.STRING,
    seat_class: DataTypes.STRING,
    base_price: DataTypes.DECIMAL,
    pos_row: DataTypes.INTEGER,
    pos_col: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'SeatTemplateSeat',
  });
  return SeatTemplateSeat;
};