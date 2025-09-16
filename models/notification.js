'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Notification.associate = (m) => {
        Notification.belongsTo(m.User, {
          foreignKey: "user_id",
          as: "user",
          onDelete: "CASCADE",
        });
      };
    }
  }
  Notification.init({
    user_id: DataTypes.BIGINT,
    type: DataTypes.STRING,
    title: DataTypes.STRING,
    body: DataTypes.TEXT,
    sent_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Notification',
  });
  return Notification;
};