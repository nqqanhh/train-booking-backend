"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(q, Sequelize) {
    const { BIGINT,INTEGER, STRING, ENUM, DATE, DATEONLY, JSON } = Sequelize;

    await q.createTable("TripSchedules", {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },

      route_id: {
        type: BIGINT,
        allowNull: false,
        references: { model: "Routes", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      vehicle_no: { type: STRING(20), allowNull: false }, // VD: SE1

      // lặp hằng ngày / hằng tuần
      freq: {
        type: ENUM("daily", "weekly"),
        allowNull: false,
        defaultValue: "daily",
      },
      // nếu weekly: danh sách thứ trong tuần "1,2,3,4,5,6,7" (1=Mon)
      days_of_week: { type: STRING(20), allowNull: true },

      start_date: { type: DATEONLY, allowNull: false }, // "2025-10-01"
      end_date: { type: DATEONLY, allowNull: true }, // null = vô thời hạn

      depart_hm: { type: STRING(5), allowNull: false }, // "13:00"
      eta_minutes: { type: INTEGER, allowNull: false }, // ví dụ 180

      timezone: {
        type: STRING(64),
        allowNull: false,
        defaultValue: "Asia/Ho_Chi_Minh",
      },

      status: {
        type: ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },

      // định nghĩa các toa mặc định khi sinh trip (đơn giản, gọn)
      // [{ seat_template_id, carriage_no, name }]
      carriages_json: { type: JSON, allowNull: true },

      // ngoại lệ: nghỉ lễ / chạy thêm
      // { skip_dates:["2025-12-31"], extra: [{date:"2025-02-01", depart_hm:"14:00"}] }
      exceptions_json: { type: JSON, allowNull: true },

      created_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // idempotent chống sinh trùng chuyến: same route + departure_time + vehicle_no
    await q.addIndex("Trips", ["route_id", "departure_time", "vehicle_no"], {
      unique: true,
      name: "uk_trip_unique",
    });
  },

  async down(q) {
    await q.dropTable("TripSchedules");
    await q.removeIndex("Trips", "uk_trip_unique").catch(() => {});
  },
};
