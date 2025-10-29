export async function up(q, Sequelize) {
  await q.addColumn("Carriages", "name", {
    type: Sequelize.STRING(100),
    allowNull: true,
    after: "trip_id",
  });
}
export async function down(q) {
  await q.removeColumn("Carriages", "name");
}
