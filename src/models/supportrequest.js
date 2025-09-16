"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SupportRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SupportRequest.associate = (m) => {
        SupportRequest.belongsTo(m.User, {
          foreignKey: "user_id",
          as: "user",
          onDelete: "SET NULL",
        });
      };
    }
  }
  SupportRequest.init(
    {
      user_id: DataTypes.BIGINT,
      subject: DataTypes.STRING,
      message: DataTypes.TEXT,
      status: DataTypes.STRING,
      created_at: DataTypes.DATE,
      closed_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "SupportRequest",
    }
  );
  return SupportRequest;
};
