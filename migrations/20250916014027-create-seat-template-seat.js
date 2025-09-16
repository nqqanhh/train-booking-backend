"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "SeatTemplateSeats",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        template_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "SeatTemplates", key: "id" },
          onDelete: "CASCADE",
        },
        seat_code: { type: Sequelize.STRING(32), allowNull: false },
        seat_class: {
          type: Sequelize.ENUM("vip", "standard"),
          allowNull: false,
        },
        base_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        pos_row: { type: Sequelize.INTEGER },
        pos_col: { type: Sequelize.INTEGER },
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
          uk_tpl_code: { fields: ["template_id", "seat_code"] },
        },
        indexes: [{ name: "idx_sts_template", fields: ["template_id"] }],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("SeatTemplateSeats");
  },
};
