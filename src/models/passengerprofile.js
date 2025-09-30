"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class PassengerProfile extends Model {
    static associate(m) {
      PassengerProfile.belongsTo(m.User, { foreignKey: "user_id", as: "user" });
      PassengerProfile.hasMany(m.OrderItem, {
        foreignKey: "passenger_id",
        as: "order_items",
      });
    }
  }

  PassengerProfile.init(
    {
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      full_name: { type: DataTypes.STRING(255), allowNull: false },
      id_no: { type: DataTypes.STRING(64) },
      dob: { type: DataTypes.DATEONLY },
      phone: { type: DataTypes.STRING(32) },
    },
    {
      sequelize,
      modelName: "PassengerProfile",
      tableName: "PassengerProfiles",
      underscored: true,
      timestamps: true,
    }
  );

  return PassengerProfile;
};
