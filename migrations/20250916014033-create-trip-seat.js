"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "TripSeats",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        trip_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "Trips", key: "id" },
          onDelete: "CASCADE",
        },
        seat_code: { type: Sequelize.STRING(32), allowNull: false },
        seat_class: {
          type: Sequelize.ENUM("vip", "standard"),
          allowNull: false,
        },
        price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        status: {
          type: Sequelize.ENUM("available", "sold"),
          allowNull: false,
          defaultValue: "available",
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
        uniqueKeys: {
          uk_trip_seat: { fields: ["trip_id", "seat_code"] },
        },
        indexes: [
          { name: "idx_trip_seats_trip_status", fields: ["trip_id", "status"] },
        ],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("TripSeats");
  },
};
