// src/middlewares/auth.js
import { verifyAccessToken } from "../utils/jwt.js";

export default function authorizationToken(req, res, next) {
  try {
    // Lấy header (case-insensitive)
    const authHeader =
      req.headers.authorization || req.get("authorization") || "";

    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ message: "missing tokens" });
    }

    const token = authHeader.slice(7).trim(); // cắt "Bearer " (7 ký tự)
    if (!token) {
      return res.status(401).json({ message: "missing tokens" });
    }

    const payload = verifyAccessToken(token); // { id, role, ... }
    req.user = payload;

    return next(); // nhớ gọi next()
  } catch (error) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
}
