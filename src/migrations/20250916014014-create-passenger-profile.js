"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "PassengerProfiles",
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
          onDelete: "CASCADE",
        },
        full_name: { type: Sequelize.STRING, allowNull: false },
        id_no: { type: Sequelize.STRING(64) },
        dob: { type: Sequelize.DATEONLY },
        phone: { type: Sequelize.STRING(32) },
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
        indexes: [{ name: "idx_pp_user", fields: ["user_id"] }],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("PassengerProfiles");
  },
};
