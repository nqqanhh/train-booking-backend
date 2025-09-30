"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(m) {
      Notification.belongsTo(m.User, { foreignKey: "user_id", as: "user" });
    }
  }

  Notification.init(
    {
      user_id: { type: DataTypes.BIGINT },
      type: { type: DataTypes.STRING(32) },
      title: { type: DataTypes.STRING(255) },
      body: { type: DataTypes.TEXT },
      sent_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "Notification",
      tableName: "Notifications",
      underscored: true,
      timestamps: true,
    }
  );

  return Notification;
};
