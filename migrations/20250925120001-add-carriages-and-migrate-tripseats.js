"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(q, S) {
    // 1) Tạo bảng Carriages
    await q.createTable("Carriages", {
      id: {
        type: S.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      trip_id: { type: S.BIGINT, allowNull: false },
      seat_template_id: { type: S.BIGINT, allowNull: false },
      carriage_no: { type: S.STRING(16), allowNull: false }, // ví dụ "1", "2", "A", ...
      created_at: {
        type: S.DATE,
        allowNull: false,
        defaultValue: S.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: S.DATE,
        allowNull: false,
        defaultValue: S.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    // FK
    await q.addConstraint("Carriages", {
      fields: ["trip_id"],
      type: "foreign key",
      name: "fk_carriages_trip",
      references: { table: "Trips", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    await q.addConstraint("Carriages", {
      fields: ["seat_template_id"],
      type: "foreign key",
      name: "fk_carriages_template",
      references: { table: "SeatTemplates", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    await q.addIndex("Carriages", ["trip_id", "carriage_no"], {
      unique: true,
      name: "uk_trip_no",
    });

    // 2) Chuẩn bị TripSeats: thêm cột carriage_id (nullable tạm thời)
    await q.addColumn("TripSeats", "carriage_id", {
      type: S.BIGINT,
      allowNull: true,
    });

    // 3) Tạo Carriage mặc định cho mỗi Trip hiện có
    // carriage_no = "1", seat_template_id = Trips.seat_template_id
    await q.sequelize.query(`
      INSERT INTO Carriages (trip_id, seat_template_id, carriage_no, created_at, updated_at)
      SELECT t.id, t.seat_template_id, '1', NOW(), NOW()
      FROM Trips t
      WHERE NOT EXISTS (
        SELECT 1 FROM Carriages c WHERE c.trip_id = t.id AND c.carriage_no = '1'
      );
    `);

    // 4) Gán TripSeats.carriage_id = Carriages.id tương ứng theo trip_id
    // (vì ta vừa tạo 1 carriage "1" cho mỗi trip)
    await q.sequelize.query(`
      UPDATE TripSeats ts
      JOIN Carriages c ON c.trip_id = ts.trip_id AND c.carriage_no = '1'
      SET ts.carriage_id = c.id
      WHERE ts.carriage_id IS NULL;
    `);

    // 5) Thêm FK cho TripSeats.carriage_id
    await q.addConstraint("TripSeats", {
      fields: ["carriage_id"],
      type: "foreign key",
      name: "fk_tripseats_carriage",
      references: { table: "Carriages", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // 6) Xoá unique/index cũ và cột trip_id ở TripSeats, thay bằng unique mới
    // Tên index cũ của bạn có thể khác, nếu báo lỗi "không tồn tại" thì bỏ try/catch
    try {
      await q.removeIndex("TripSeats", "uk_trip_seat");
    } catch (_) {}
    try {
      await q.removeIndex("TripSeats", "idx_trip_seats_trip_status");
    } catch (_) {}

    // drop FK cũ trip_id nếu có tên cụ thể
    try {
      await q.removeConstraint("TripSeats", "fk_trip_seats_trip");
    } catch (_) {}

    // Bỏ cột trip_id
    try {
      await q.removeColumn("TripSeats", "trip_id");
    } catch (_) {}

    // Unique mới trên (carriage_id, seat_code)
    await q.addIndex("TripSeats", ["carriage_id", "seat_code"], {
      unique: true,
      name: "uk_carriage_seat",
    });

    // 7) Đặt NOT NULL cho carriage_id
    // MySQL không support alter column to not null dễ với FK → tách step
    await q.sequelize.query(`
      ALTER TABLE TripSeats
      MODIFY carriage_id BIGINT NOT NULL;
    `);
  },

  async down(q, S) {
    // DOWN: quay lại thiết kế cũ (TripSeats có trip_id, không có carriage_id), xoá Carriages
    // 1) Thêm lại cột trip_id (nullable tạm)
    await q.addColumn("TripSeats", "trip_id", {
      type: S.BIGINT,
      allowNull: true,
    });

    // 2) Map ngược từ carriage_id → trip_id
    await q.sequelize.query(`
      UPDATE TripSeats ts
      JOIN Carriages c ON c.id = ts.carriage_id
      SET ts.trip_id = c.trip_id
      WHERE ts.trip_id IS NULL;
    `);

    // 3) FK lại về Trips
    await q.addConstraint("TripSeats", {
      fields: ["trip_id"],
      type: "foreign key",
      name: "fk_trip_seats_trip",
      references: { table: "Trips", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // 4) Xoá index mới, tạo lại index cũ
    try {
      await q.removeIndex("TripSeats", "uk_carriage_seat");
    } catch (_) {}
    await q.addIndex("TripSeats", ["trip_id", "seat_code"], {
      unique: true,
      name: "uk_trip_seat",
    });

    // 5) Bỏ carriage_id NOT NULL → rồi xoá cột carriage_id
    await q.sequelize.query(
      `ALTER TABLE TripSeats MODIFY carriage_id BIGINT NULL;`
    );
    await q
      .removeConstraint("TripSeats", "fk_tripseats_carriage")
      .catch(() => {});
    await q.removeColumn("TripSeats", "carriage_id").catch(() => {});

    // 6) Sau cùng xoá Carriages
    await q.dropTable("Carriages");
  },
};
