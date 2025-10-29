"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(q, S) {
    // Nếu trước đó đã lỡ tạo bảng "TripSeatPricing" (PascalCase) thì drop để tránh đụng tên
    // (Bỏ dòng dưới nếu bạn chắc chắn chưa có bảng này)
    await q.sequelize.query("DROP TABLE IF EXISTS `TripSeatPricing`;");

    // Tạo bảng snake_case theo đúng mong muốn
    await q.createTable("trip_seat_pricing", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: S.BIGINT,
      },
      trip_id: {
        type: S.BIGINT /* hoặc S.BIGINT.UNSIGNED nếu Trips.id là unsigned */,
        allowNull: false,
      },
      seat_code: { type: S.STRING(32), allowNull: false },
      price: { type: S.DECIMAL(12, 2), allowNull: false },
      // không dùng timestamps cho bảng này theo thiết kế
    });

    // FK → Trips.id  (chú ý tên bảng gốc của bạn là "Trips", PascalCase)
    await q.addConstraint("trip_seat_pricing", {
      fields: ["trip_id"],
      type: "foreign key",
      name: "fk_tsp_trip",
      references: { table: "Trips", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Unique & Index
    await q.addIndex("trip_seat_pricing", ["trip_id", "seat_code"], {
      unique: true,
      name: "uk_trip_price",
    });
    await q.addIndex("trip_seat_pricing", ["trip_id"], {
      name: "idx_price_trip",
    });
  },

  async down(q, S) {
    await q.dropTable("trip_seat_pricing");
  },
};
