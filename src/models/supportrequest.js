"use strict";
import { Model } from "sequelize";
export default (sequelize, DataTypes) => {
  class SupportRequest extends Model {
    static associate(m) {
      SupportRequest.belongsTo(m.User, { foreignKey: "user_id", as: "user" });
    }
  }

  SupportRequest.init(
    {
      user_id: { type: DataTypes.BIGINT },
      subject: { type: DataTypes.STRING(255) },
      message: { type: DataTypes.TEXT },
      status: { type: DataTypes.STRING(32), defaultValue: "open" },
      created_at: { type: DataTypes.DATE, allowNull: false },
      closed_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "SupportRequest",
      tableName: "SupportRequests",
      underscored: true,
      timestamps: true,
    }
  );

  return SupportRequest;
};
