'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Payments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      order_id: {
        type: Sequelize.BIGINT,
      },
      provider: {
        type: Sequelize.STRING,
      },
      provider_txn_id: {
        type: Sequelize.STRING,
      },
      amount: {
        type: Sequelize.DECIMAL,
      },
      status: {
        type: Sequelize.ENUM("initiated", "succeeded", "failed", "refunded"),
      },
      raw_payload: {
        type: Sequelize.JSON,
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
    await queryInterface.dropTable('Payments');
  }
};