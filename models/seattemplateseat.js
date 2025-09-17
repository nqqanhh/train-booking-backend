"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class SeatTemplateSeat extends Model {
    static associate(m) {
      SeatTemplateSeat.belongsTo(m.SeatTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
    }
  }

  SeatTemplateSeat.init(
    {
      template_id: { type: DataTypes.BIGINT, allowNull: false },
      seat_code: { type: DataTypes.STRING(32), allowNull: false },
      seat_class: { type: DataTypes.ENUM("vip", "standard"), allowNull: false },
      base_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      pos_row: { type: DataTypes.INTEGER, allowNull: false },
      pos_col: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "SeatTemplateSeat",
      tableName: "SeatTemplateSeats",
      underscored: true,
      timestamps: false,
    }
  );

  return SeatTemplateSeat;
};
