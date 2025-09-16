"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Trips",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        route_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "Routes", key: "id" },
        },
        departure_time: { type: Sequelize.DATE, allowNull: false },
        arrival_time: { type: Sequelize.DATE },
        vehicle_no: { type: Sequelize.STRING(64) },
        status: {
          type: Sequelize.ENUM("scheduled", "closed", "cancelled", "completed"),
          allowNull: false,
          defaultValue: "scheduled",
        },
        seat_template_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "SeatTemplates", key: "id" },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal(
            "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
          ),
        },
      },
      {
        indexes: [
          {
            name: "idx_trips_route_depart",
            fields: ["route_id", "departure_time"],
          },
          { name: "idx_trips_template", fields: ["seat_template_id"] },
        ],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Trips");
  },
};
