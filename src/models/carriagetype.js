// models/carriagetype.js
"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class CarriageType extends Model {
    static associate(m) {
      CarriageType.hasMany(m.SeatTemplate, {
        foreignKey: "carriage_type_id",
        as: "seat_templates",
      });
    }
  }

  CarriageType.init(
    {
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "CarriageType",
      tableName: "CarriageTypes",
      timestamps: true,
      underscored: true,
    }
  );

  return CarriageType;
};
