'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Ticket extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Ticket.associate = (m) => {
        Ticket.belongsTo(m.OrderItem, {
          foreignKey: "order_item_id",
          as: "order_item",
          onDelete: "CASCADE",
        });
      };
    }
  }
  Ticket.init({
    order_item_id: DataTypes.BIGINT,
    qr_payload: DataTypes.TEXT,
    status: DataTypes.STRING,
    issued_at: DataTypes.DATE,
    used_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Ticket',
  });
  return Ticket;
};