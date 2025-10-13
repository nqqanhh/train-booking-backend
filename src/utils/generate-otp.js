import crypto from "crypto";

const OTP_LEN = Number(process.env.OTP_LENGTH || 6);
const OTP_EXPIRE_MIN = Number(process.env.OTP_EXPIRE_MIN || 5);

/** Tạo OTP n số, trả về {otp, hash, expiresAt} */
export function generateOtp() {
  const max = Math.pow(10, OTP_LEN);
  const otp = crypto.randomInt(0, max).toString().padStart(OTP_LEN, "0");
  return { otp, expiresAt: new Date(Date.now() + OTP_EXPIRE_MIN * 60 * 1000) };
}

/** Hash OTP (SHA256 + secret) */
export function hashOtp(otp) {
  const secret = process.env.OTP_SECRET || "dev-otp-secret";
  return crypto.createHmac("sha256", secret).update(String(otp)).digest("hex");
}

export function verifyOtp(plain, hash) {
  const h = hashOtp(plain);
  // so sánh an toàn thời gian
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
}
