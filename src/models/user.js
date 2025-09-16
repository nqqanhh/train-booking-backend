"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.associate = (m) => {
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
        }); // FK SET NULL
      };
    }
  }
  User.init(
    {
      full_name: DataTypes.STRING,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      password_hash: DataTypes.TEXT,
      role: DataTypes.STRING,
      status: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
