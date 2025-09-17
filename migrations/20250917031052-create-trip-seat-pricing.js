"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(q, S) {
    // Nếu trước đó có bảng snake_case lỡ tay tạo, drop để tránh đụng (không bắt buộc)
    await q.sequelize.query("DROP TABLE IF EXISTS `trip_seat_pricing`;");

    await q.createTable("TripSeatPricing", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: S.BIGINT,
      },
      trip_id: { type: S.BIGINT, allowNull: false }, // KHỚP Trips.id (bigint signed)
      seat_code: { type: S.STRING(32), allowNull: false },
      price: { type: S.DECIMAL(12, 2), allowNull: false },
    });

    // FK → Trips(id)
    // await q.addConstraint("TripSeatPricing", {
    //   fields: ["trip_id"],
    //   type: "foreign key",
    //   name: "fk_tsp_trip",
    //   references: { table: "Trips", field: "id" },
    //   onDelete: "CASCADE",
    //   onUpdate: "CASCADE",
    // });

    // Unique và index
    await q.addIndex("TripSeatPricing", ["trip_id", "seat_code"], {
      unique: true,
      name: "uk_trip_price",
    });
    await q.addIndex("TripSeatPricing", ["trip_id"], {
      name: "idx_price_trip",
    });
  },

  async down(q) {
    await q.dropTable("TripSeatPricing");
  },
};
