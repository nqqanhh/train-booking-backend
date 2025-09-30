'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Trips", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      route_id: {
        type: Sequelize.BIGINT,
      },
      departure_time: {
        type: Sequelize.DATE,
      },
      arrival_time: {
        type: Sequelize.DATE,
      },
      vehicle_no: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM("scheduled", "closed", "cancelled", "completed"),
      },
      seat_template_id: {
        type: Sequelize.BIGINT,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Trips');
  }
};