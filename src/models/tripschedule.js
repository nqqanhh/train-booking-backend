"use strict";
export default (sequelize, DataTypes) => {
  const TripSchedule = sequelize.define(
    "TripSchedule",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      route_id: { type: DataTypes.BIGINT, allowNull: false },
      vehicle_no: { type: DataTypes.STRING(20), allowNull: false },

      freq: {
        type: DataTypes.ENUM("daily", "weekly"),
        allowNull: false,
        defaultValue: "daily",
      },
      days_of_week: { type: DataTypes.STRING(20), allowNull: true },

      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },

      depart_hm: { type: DataTypes.STRING(5), allowNull: false },
      eta_minutes: { type: DataTypes.INTEGER, allowNull: false },

      timezone: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "Asia/Ho_Chi_Minh",
      },

      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },

      carriages_json: { type: DataTypes.JSON, allowNull: true },
      exceptions_json: { type: DataTypes.JSON, allowNull: true },
    },
    {
      tableName: "TripSchedules",
      underscored: true,
    }
  );

  TripSchedule.associate = (models) => {
    TripSchedule.belongsTo(models.Route, { foreignKey: "route_id" });
  };

  return TripSchedule;
};
