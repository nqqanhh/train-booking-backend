"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Payments",
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
        provider: { type: Sequelize.STRING(64), allowNull: false },
        provider_txn_id: { type: Sequelize.STRING(128) },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        status: {
          type: Sequelize.ENUM("initiated", "succeeded", "failed", "refunded"),
          allowNull: false,
        },
        raw_payload: { type: Sequelize.JSON },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      {
        uniqueKeys: {
          uk_provider_txn: { fields: ["provider", "provider_txn_id"] },
        },
        indexes: [{ name: "idx_pay_order", fields: ["order_id"] }],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Payments");
  },
};
