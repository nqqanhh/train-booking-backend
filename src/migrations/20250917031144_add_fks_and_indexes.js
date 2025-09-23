"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(q, S) {
    // ===== SeatTemplateSeats =====
    await q.addConstraint("SeatTemplateSeats", {
      fields: ["template_id"],
      type: "foreign key",
      name: "fk_sts_template",
      references: { table: "SeatTemplates", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addIndex("SeatTemplateSeats", ["template_id", "seat_code"], {
      unique: true,
      name: "uk_tpl_code",
    });
    await q.addIndex(
      "SeatTemplateSeats",
      ["template_id", "pos_row", "pos_col"],
      { name: "idx_tpl_grid" }
    );

    // ===== PassengerProfiles =====
    await q.addConstraint("PassengerProfiles", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_pp_user",
      references: { table: "Users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // ===== Trips =====
    await q.addConstraint("Trips", {
      fields: ["route_id"],
      type: "foreign key",
      name: "fk_trips_route",
      references: { table: "Routes", field: "id" },
    });
    await q.addConstraint("Trips", {
      fields: ["seat_template_id"],
      type: "foreign key",
      name: "fk_trips_template",
      references: { table: "SeatTemplates", field: "id" },
    });
    await q.addIndex("Trips", ["route_id", "departure_time"], {
      name: "idx_trips_route_depart",
    });
    await q.addIndex("Trips", ["seat_template_id"], {
      name: "idx_trips_template",
    });

    // ===== TripSeatPricing =====
    await q.addConstraint("TripSeatPricing", {
      fields: ["trip_id"],
      type: "foreign key",
      name: "fk_tsp_trip",
      references: { table: "Trips", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // await q.addIndex("TripSeatPricing", ["trip_id", "seat_code"], {
    //   unique: true,
    //   name: "uk_trip_price",
    // });
    // await q.addIndex("TripSeatPricing", ["trip_id"], {
    //   name: "idx_price_trip",
    // });

    // ===== Orders =====
    await q.addConstraint("Orders", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_orders_user",
      references: { table: "Users", field: "id" },
    });
    await q.addIndex("Orders", ["user_id", "createdAt"], {
      name: "idx_orders_user",
    }); // hoặc created_at nếu bạn đổi

    // ===== OrderItems =====
    await q.addConstraint("OrderItems", {
      fields: ["order_id"],
      type: "foreign key",
      name: "fk_order_items_order",
      references: { table: "Orders", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addConstraint("OrderItems", {
      fields: ["trip_id"],
      type: "foreign key",
      name: "fk_order_items_trip",
      references: { table: "Trips", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    await q.addIndex("OrderItems", ["order_id", "trip_id", "seat_code"], {
      unique: true,
      name: "uk_order_item_trip_code",
    });

    // ===== Payments =====
    await q.addConstraint("Payments", {
      fields: ["order_id"],
      type: "foreign key",
      name: "fk_payments_order",
      references: { table: "Orders", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addIndex("Payments", ["provider", "provider_txn_id"], {
      unique: true,
      name: "uk_provider_txn",
    });

    // ===== TripSeats (sold overlay) =====
    await q.addConstraint("TripSeats", {
      fields: ["trip_id"],
      type: "foreign key",
      name: "fk_ts_trip",
      references: { table: "Trips", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addConstraint("TripSeats", {
      fields: ["order_item_id"],
      type: "foreign key",
      name: "fk_ts_order_item",
      references: { table: "OrderItems", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addIndex("TripSeats", ["trip_id", "seat_code"], {
      unique: true,
      name: "uk_trip_seat",
    });

    // ===== Tickets =====
    await q.addConstraint("Tickets", {
      fields: ["order_item_id"],
      type: "foreign key",
      name: "fk_tickets_order_item",
      references: { table: "OrderItems", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // ===== Notifications =====
    await q.addConstraint("Notifications", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_noti_user",
      references: { table: "Users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addIndex("Notifications", ["user_id", "sent_at"], {
      name: "idx_noti_user",
    });

    // ===== SupportRequests =====
    await q.addConstraint("SupportRequests", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_sr_user",
      references: { table: "Users", field: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    await q.addIndex("SupportRequests", ["user_id", "created_at"], {
      name: "idx_sr_user",
    });
  },

  async down(q) {
    // gỡ index/constraint theo name (có thể bỏ qua cho ngắn)
  },
};
