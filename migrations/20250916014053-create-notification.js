"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Notifications",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        user_id: {
          type: Sequelize.BIGINT,
          references: { model: "Users", key: "id" },
          onDelete: "CASCADE",
        },
        type: { type: Sequelize.STRING(32) },
        title: { type: Sequelize.STRING(255) },
        body: { type: Sequelize.TEXT },
        sent_at: { type: Sequelize.DATE },
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
        indexes: [{ name: "idx_noti_user", fields: ["user_id", "sent_at"] }],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Notifications");
  },
};
