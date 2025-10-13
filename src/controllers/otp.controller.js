import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../models/index.js";
import { generateOtp, hashOtp, verifyOtp } from "../utils/generate-otp.js";
import sendOTPEmail from "../services/sendEmail.service.js";
const { User, Otp } = db;

const MAX_ATTEMPTS = 5;
const MIN_REQUEST_INTERVAL_SEC = 60;

function issueResetToken(email) {
  const ttl = Number(process.env.RESET_TOKEN_TTL_MIN || 10);
  return jwt.sign(
    { sub: email, purpose: "reset_password" },
    process.env.RESET_JWT_SECRET || "dev-reset-secret",
    { expiresIn: `${ttl}m` }
  );
}

// POST /auth/otp/request  { email }
const requestOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "email required" });

    // user phải tồn tại (tránh lộ thông tin: trả response chung)
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(200)
        .json({ message: "If this email exists, an OTP has been sent." });
    }

    // rate limit: 1 request / 60s
    const last = await Otp.findOne({
      where: { email, purpose: "reset_password" },
      order: [["created_at", "DESC"]],
      raw: true,
    });
    if (
      last &&
      Date.now() - new Date(last.created_at).getTime() <
        MIN_REQUEST_INTERVAL_SEC * 1000
    ) {
      return res
        .status(429)
        .json({ message: "Too many requests. Try again in a minute." });
    }

    const { otp, expiresAt } = generateOtp();
    const rec = await Otp.create({
      email,
      purpose: "reset_password",
      otp_hash: hashOtp(otp),
      expires_at: expiresAt,
      attempts: 0,
    });

    const devEcho =
      process.env.NODE_ENV !== "production" ? { dev_otp: otp } : undefined;
    const userEmail = email;
    sendOTPEmail(userEmail, otp).then((success) => {
      if (success) {
        console.log("OTP sent successfully to", userEmail);
      } else {
        console.log("Failed to send OTP to", userEmail);
      }
    });
    return res.status(200).json({
      message: "OTP created",
      expires_at: rec.expires_at,
      ...devEcho,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "request-otp failed", detail: e.message });
  }
};

// POST /auth/otp/verify  { email, otp }
const verifyOtpCode = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp)
      return res.status(400).json({ message: "email & otp required" });

    // lấy mã mới nhất chưa dùng & chưa hết hạn
    const rec = await Otp.findOne({
      where: {
        email,
        purpose: "reset_password",
        consumed_at: null,
      },
      order: [["created_at", "DESC"]],
    });
    if (!rec) return res.status(400).json({ message: "OTP invalid" });

    if (new Date(rec.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }
    if (rec.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts" });
    }

    const ok = verifyOtp(otp, rec.otp_hash);
    await rec.update({ attempts: rec.attempts + 1 });

    if (!ok) return res.status(400).json({ message: "OTP incorrect" });

    // mark consumed
    await rec.update({ consumed_at: new Date() });

    // cấp reset token ngắn hạn
    const reset_token = issueResetToken(email);
    return res.status(200).json({ message: "OTP verified", reset_token });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "verify-otp failed", detail: e.message });
  }
};

// POST /auth/password/reset  { email, reset_token, new_password }
const resetPassword = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { email, reset_token, new_password } = req.body || {};
    if (!email || !reset_token || !new_password) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "email, reset_token, new_password required" });
    }
    // verify reset token
    let payload;
    try {
      payload = jwt.verify(
        reset_token,
        process.env.RESET_JWT_SECRET || "dev-reset-secret"
      );
    } catch {
      await t.rollback();
      return res.status(400).json({ message: "reset_token invalid/expired" });
    }
    if (payload?.purpose !== "reset_password" || payload?.sub !== email) {
      await t.rollback();
      return res.status(400).json({ message: "reset_token invalid" });
    }

    const user = await User.findOne({ where: { email }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await user.update({ password_hash }, { transaction: t });

    // (tuỳ chọn) thu hồi toàn bộ OTP chưa dùng
    await Otp.update(
      { consumed_at: new Date() },
      { where: { email, consumed_at: null }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (e) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "reset-password failed", detail: e.message });
  }
};
const otpController = { requestOtp, verifyOtpCode, resetPassword };
export default otpController;
