"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Orders",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "Users", key: "id" },
        },
        status: {
          type: Sequelize.ENUM(
            "pending",
            "paid",
            "cancelled",
            "refunded",
            "failed"
          ),
          allowNull: false,
          defaultValue: "pending",
        },
        total_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        coupon_code: { type: Sequelize.STRING(64) },
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
          { name: "idx_orders_user", fields: ["user_id", "createdAt"] },
        ],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Orders");
  },
};
