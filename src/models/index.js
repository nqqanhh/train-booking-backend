"use strict";

import fs from "fs";
import path from "path";
import { Sequelize, DataTypes } from "sequelize";
import process from "process";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";

// Load config.json (kiểu sequelize-cli)
const configFile = require("../config/config.json");
const config = configFile[env];

const db = {};
let sequelize;

// ─────────────────────────────────────────────────────────────
// Option 1: Dùng biến môi trường (Render/Railway khuyên dùng)
//   - Nếu có config.use_env_variable, lấy chuỗi kết nối từ env
//   - Hoặc tự lấy DB_* từ env
// ─────────────────────────────────────────────────────────────
if (config.use_env_variable) {
  // ví dụ: process.env[config.use_env_variable] = "mysql://user:pass@host:3306/dbname"
  sequelize = new Sequelize(process.env[config.use_env_variable], {
    ...config,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    timezone: "+07:00",
    define: { underscored: true, freezeTableName: true },
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      // Nếu nhà cung cấp yêu cầu SSL (PlanetScale/GCloud SQL qua proxy, v.v.)
      // ssl: { require: true, rejectUnauthorized: false },
    },
  });
} else if (process.env.DB_HOST) {
  // Không dùng chuỗi kết nối, mà dùng DB_* rời
  const {
    DB_HOST, DB_PORT = 3306, DB_NAME, DB_USER, DB_PASS,
  } = process.env;

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    timezone: "+07:00",
    define: { underscored: true, freezeTableName: true },
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      // ssl: { require: true, rejectUnauthorized: false },
    },
  });
} else {
  // ───────────────────────────────────────────────────────────
  // Option 2: Dùng config.json thuần (dev/local)
  // Ở chuẩn sequelize-cli, các key đúng phải là:
  //   database, username, password, host, port, dialect, ...
  // Kiểm tra file config.json của bạn khớp tên key này chưa!
  // ───────────────────────────────────────────────────────────
  sequelize = new Sequelize(
    config.database,      // <- database name
    config.username,      // <- username
    config.password,      // <- password
    {
      host: config.host,
      port: config.port || 3306,
      dialect: config.dialect || "mysql",
      logging: env === "development" ? console.log : false,
      timezone: "+07:00",
      define: { underscored: true, freezeTableName: true },
      dialectOptions: {
        dateStrings: true,
        typeCast: true,
        // ssl: { require: true, rejectUnauthorized: false },
      },
    }
  );
}

// Load tất cả model trong thư mục
const files = fs.readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.endsWith(".js") &&
    !file.endsWith(".test.js")
  );
});

for (const file of files) {
  const fileUrl = pathToFileURL(path.join(__dirname, file)).href;
  const modelModule = await import(fileUrl);
  const model = modelModule.default(sequelize, DataTypes);
  db[model.name] = model;
}

// Thiết lập associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
