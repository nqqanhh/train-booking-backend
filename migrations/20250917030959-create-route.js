'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Routes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      origin: {
        type: Sequelize.STRING,
      },
      destination: {
        type: Sequelize.STRING,
      },
      distance_km: {
        type: Sequelize.DECIMAL,
      },
      eta_minutes: {
        type: Sequelize.INTEGER,
      },
      active: {
        type: Sequelize.BOOLEAN,
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
    await queryInterface.dropTable('Routes');
  }
};