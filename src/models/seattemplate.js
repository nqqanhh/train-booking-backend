"use strict";
import { Model } from "sequelize";
import Sequelize from "sequelize";
export default (sequelize, DataTypes) => {
  class SeatTemplate extends Model {
    static associate(m) {
      SeatTemplate.hasMany(m.SeatTemplateSeat, {
        foreignKey: "template_id",
        as: "seats",
        onDelete: "CASCADE",
      });
      SeatTemplate.hasMany(m.Trip, {
        foreignKey: "seat_template_id",
        as: "trips",
      });
    }
  }

  SeatTemplate.init(
    {
      name: { type: DataTypes.STRING(255), allowNull: false },
      meta_json: { type: DataTypes.JSON },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      sequelize,
      modelName: "SeatTemplate",
      tableName: "SeatTemplates",
      timestamps: true,
      underscored: true, // <-- quan trọng
      createdAt: "created_at", // (tùy chọn) tường minh
      updatedAt: "updated_at", // (tùy chọn)
    }
  );

  return SeatTemplate;
};
