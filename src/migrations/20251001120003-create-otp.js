/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(q, Sequelize) {
    await q.createTable("Otps", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false },
      purpose: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "reset_password",
      },
      otp_hash: { type: Sequelize.STRING(255), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      consumed_at: { type: Sequelize.DATE, allowNull: true },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      meta_json: { type: Sequelize.JSON, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
    await q.addIndex("Otps", ["email"]);
    await q.addIndex("Otps", ["expires_at"]);
    await q.addIndex("Otps", ["email", "purpose"]);
  },

  async down(q) {
    await q.dropTable("Otps");
  },
};
