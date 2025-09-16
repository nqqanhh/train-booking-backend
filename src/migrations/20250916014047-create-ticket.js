"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Tickets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      order_item_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
        references: { model: "OrderItems", key: "id" },
        onDelete: "CASCADE",
      },
      qr_payload: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM("valid", "used", "refunded"),
        allowNull: false,
        defaultValue: "valid",
      },
      issuedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      usedAt: { type: Sequelize.DATE },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Tickets");
  },
};
