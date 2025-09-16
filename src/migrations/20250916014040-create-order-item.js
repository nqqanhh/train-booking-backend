"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "OrderItems",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        order_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "Orders", key: "id" },
          onDelete: "CASCADE",
        },
        trip_seat_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "TripSeats", key: "id" },
        },
        passenger_name: { type: Sequelize.STRING, allowNull: false },
        passenger_id_no: { type: Sequelize.STRING(64) },
        unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        discount_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
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
          uk_order_item_seat: { fields: ["order_id", "trip_seat_id"] },
        },
        indexes: [
          { name: "idx_oi_order", fields: ["order_id"] },
          { name: "idx_oi_trip_seat", fields: ["trip_seat_id"] },
        ],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("OrderItems");
  },
};
