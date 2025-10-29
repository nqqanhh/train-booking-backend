import express from "express";
import bodyParser from "body-parser";
import router from "./src/routes/index.js";
import cors from "cors";
import dotenv from "dotenv";
import db from "./src/models/index.js";
import rssRouter from "./src/routes/rss_proxy.route.js";
import diag from "./src/routes/_diag.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT;
//
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
//
app.use("/api", router);
//
app.get("/", (req, res) => {
  res.send(`App is running on PORT ${PORT}`);
});
// mount RSS proxy dưới /rss
app.use("/rss", rssRouter);
//
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
//
app.get("/api/health", (req, res) => res.json({ ok: true, time: Date.now() }));

app.get("/api/db-ping", async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({ db: "ok" });
  } catch (e) {
    res.status(500).json({ db: "fail", error: String(e) });
  }
});
//
app.use("/_diag", diag);