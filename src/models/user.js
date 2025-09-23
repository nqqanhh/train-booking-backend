"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(m) {
      User.hasMany(m.PassengerProfile, {
        foreignKey: "user_id",
        as: "passengers",
        onDelete: "CASCADE",
      });
      User.hasMany(m.Order, { foreignKey: "user_id", as: "orders" });
      User.hasMany(m.Notification, {
        foreignKey: "user_id",
        as: "notifications",
        onDelete: "CASCADE",
      });
      User.hasMany(m.SupportRequest, {
        foreignKey: "user_id",
        as: "support_requests",
      });
    }
  }

  User.init(
    {
      full_name: { type: DataTypes.STRING(255), allowNull: false },
      email: { type: DataTypes.STRING(255), unique: true },
      phone: { type: DataTypes.STRING(32), unique: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        allowNull: false,
        defaultValue: "user",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "banned"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "Users",
      underscored: false,
      timestamps: true,
    }
  );

  return User;
};
