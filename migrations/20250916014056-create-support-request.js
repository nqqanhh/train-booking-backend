"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "SupportRequests",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: { model: "Users", key: "id" },
          onDelete: "SET NULL",
        },
        subject: { type: Sequelize.STRING(255) },
        message: { type: Sequelize.TEXT },
        status: { type: Sequelize.STRING(32), defaultValue: "open" },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        closed_at: { type: Sequelize.DATE },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal(
            "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
          ),
        },
      },
      {
        indexes: [{ name: "idx_sr_user", fields: ["user_id", "createdAt"] }],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("SupportRequests");
  },
};
