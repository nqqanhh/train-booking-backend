"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SeatTemplateSeats", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      template_id: {
        type: Sequelize.BIGINT,
      },
      seat_code: {
        type: Sequelize.STRING,
      },
      seat_class: {
        type: Sequelize.ENUM("vip", "standard"),
      },
      base_price: {
        type: Sequelize.DECIMAL,
      },
      pos_row: {
        type: Sequelize.INTEGER,
      },
      pos_col: {
        type: Sequelize.INTEGER,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("SeatTemplateSeats");
  },
};
