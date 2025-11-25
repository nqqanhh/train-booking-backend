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

// Load config.json bằng require
const configFile = require("../config/config.json");
const config = configFile[env];

const db = {};

// Khởi tạo Sequelize
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], {
    ...config,
    logging: console.log,
    timezone: "+07:00",
    define: {
      underscored: true,
      freezeTableName: true,
    },
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  });
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    logging: false,
    timezone: "+07:00",
    define: {
      underscored: true,
      freezeTableName: true,
    },
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  });
}

// Load tất cả model trong thư mục
const files = fs.readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.slice(-3) === ".js" &&
    file.indexOf(".test.js") === -1
  );
});

for (const file of files) {
  const fileUrl = pathToFileURL(path.join(__dirname, file)).href;
  const modelModule = await import(fileUrl);
  const model = modelModule.default(sequelize, DataTypes);
  db[model.name] = model;
}

// Thiết lập quan hệ giữa các model
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Xuất đối tượng Sequelize & các model
db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
