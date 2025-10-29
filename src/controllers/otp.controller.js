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

// POST /auth/otp/request
const requestOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "email required" });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // tránh lộ thông tin tài khoản
      return res
        .status(200)
        .json({ message: "If this email exists, an OTP has been sent." });
    }

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

    const sent = await sendOTPEmail(email, otp);
    if (!sent) {
      // có thể xóa record vừa tạo nếu muốn
      return res.status(500).json({ message: "Failed to send OTP email." });
    }

    const devEcho =
      process.env.NODE_ENV !== "production" ? { dev_otp: otp } : {};
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

// POST /auth/otp/verify
const verifyOtpCode = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp)
      return res.status(400).json({ message: "email & otp required" });

    const rec = await Otp.findOne({
      where: { email, purpose: "reset_password", consumed_at: null },
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
    if (!ok) {
      await rec.update({ attempts: rec.attempts + 1 });
      return res.status(400).json({ message: "OTP incorrect" });
    }

    await rec.update({ consumed_at: new Date() }); // đúng thì không cần tăng attempts
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
