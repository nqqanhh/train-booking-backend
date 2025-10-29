import express from "express";
import axios from "axios";
const r = express.Router();

r.get("/ping-out", async (req, res) => {
  try {
    const { data } = await axios.get("https://api.mailtrap.io/api/health"); // endpoint public nhỏ
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, name: e.name, code: e.code, message: e.message });
  }
});

export default r;