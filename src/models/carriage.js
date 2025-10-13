"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Carriage extends Model {
    static associate(m) {
      Carriage.belongsTo(m.Trip, { foreignKey: "trip_id", as: "trip" });
      Carriage.belongsTo(m.SeatTemplate, {
        foreignKey: "seat_template_id",
        as: "seat_template",
      });
      Carriage.hasMany(m.TripSeat, {
        foreignKey: "carriage_id",
        as: "seats",
        onDelete: "CASCADE",
      });
    }
  }

  Carriage.init(
    {
      trip_id: { type: DataTypes.BIGINT, allowNull: false },
      seat_template_id: { type: DataTypes.BIGINT, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: true },

      carriage_no: { type: DataTypes.STRING(16), allowNull: false },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "Carriage",
      tableName: "Carriages",
      underscored: true,
      timestamps: true,
    }
  );

  return Carriage;
};
