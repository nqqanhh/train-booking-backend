"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Coupons", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      type: { type: Sequelize.STRING(16), allowNull: false }, // 'percent' | 'fixed'
      value: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      valid_from: { type: Sequelize.DATE },
      valid_to: { type: Sequelize.DATE },
      quota: { type: Sequelize.INTEGER },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Coupons");
  },
};
