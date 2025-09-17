'use strict';
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
      },
      qr_payload: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.ENUM("valid", "used", "refunded"),
      },
      issued_at: {
        type: Sequelize.DATE,
      },
      used_at: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Tickets');
  }
};