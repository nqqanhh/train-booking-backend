import { hash, comparePassword } from "../utils/password.js";
// import user from "../models/user.js";
import db from "../models/index.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { generateOtp } from "../utils/generate-otp.js";

import bcrypt from "bcrypt";
import sendOTPEmail from "../services/sendEmail.service.js";

const { User } = db;

const toSafeUser = (u) => ({
  id: u.id,
  full_name: u.full_name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  status: u.status,
});

export const signUp = async (req, res) => {
  try {
    const { full_name, email, phone, password, role } = req.body || {};
    if (!full_name || !email || !password) {
      return res
        .status(400)
        .json({ message: "full_name, email, password required" });
    }

    const normEmail = String(email).trim().toLowerCase();
    const existed = await User.findOne({ where: { email: normEmail } });
    if (existed)
      return res.status(409).json({ message: "Email already exists" });

    const password_hash = await bcrypt.hash(password, 10);

    const created = await User.create({
      full_name,
      email: normEmail,
      phone: phone ?? null,
      password_hash,
      role: role ?? "user",
      status: "active",
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: created.id,
        email: created.email,
        full_name: created.full_name,
        role: created.role,
      },
    });
  } catch (error) {
    console.log(error.message);
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Email already exists" });
    }
    if (error?.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({ message: error.errors?.[0]?.message || "Validation error" });
    }
    return res.status(500).json({
      message: "Lỗi server",
      detail: error?.original?.sqlMessage || error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    let { email, phone, password } = req.body || {};
    let where;
    if (email) {
      email = String(email).trim().toLowerCase();
      where = { email };
    } else {
      phone = String(phone).trim();
      where = { phone };
    }
    if (!where) {
      return res
        .status(400)
        .json({ message: "Thiếu email hoặc số điện thoại" });
    }
    console.log("where:", where);
    if (!password) {
      return res.status(400).json({ message: "Thiếu password và email/phone" });
    }

    // Ưu tiên email nếu gửi cả hai

    const user = await User.findOne({ where });
    // Không tiết lộ "email có/không", trả lỗi chung
    if (!user)
      return res.status(401).json({ message: "Sai thông tin đăng nhập 1" });

    // So khớp mật khẩu
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ message: "Sai thông tin đăng nhập" });

    // Check trạng thái tài khoản
    if (user.status === "inactive") {
      return res.status(403).json({ message: "Tài khoản chưa kích hoạt" });
    }
    if (user.status === "banned") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    const payload = {
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    const access_token = signAccessToken(payload);
    const refresh_token = signRefreshToken?.(payload);

    return res.status(200).json({
      message: "Đăng nhập thành công",
      user: toSafeUser(user),
      tokens: { access_token, ...(refresh_token && { refresh_token }) },
    });
  } catch (error) {
    console.error("LOGIN_ERROR:", {
      message: error?.message,
      sql: error?.sql,
      sqlMessage: error?.original?.sqlMessage,
    });
    return res.status(500).json({
      message: "Lỗi server",
      detail: error.message,
    });
  }
};
// const sendOtp = async (req, res) => {
//   const { email } = req.body;
//   if (!email) return res.status(400).json({ message: "Missing email" });
//   const isExist = await User.findOne({ email });
//   if (!isExist)
//     return res.status(404).json({
//       message: "Email not found",
//     });
//   try {
//     const userEmail = email;
//     const otp = generateOtp();

//     sendOTPEmail(userEmail, otp).then((success) => {
//       if (success) {
//         console.log("OTP sent successfully to", userEmail);
//       } else {
//         console.log("Failed to send OTP to", userEmail);
//       }
//     });
//     res.status(200).json({ message: "Sent email successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Internal error:" + error.message });
//   }
// };
const changePassword = async (req, res) => {
  try {
    const { oldPass, newPass } = req.body;
    if (!oldPass || !newPass)
      return res.status(400).json({
        message: "Missing credentials",
      });
    const pickUser = User.findOne({
      where: {
        email: user.email,
      },
    });
    const isCorrectPassword = await compare(oldPass, pickUser.password_hash);

    if (isCorrectPassword) {
      const newHashPassword = await hash(newPass);
      User.update(
        { password_hash: newHashPassword },
        { where: { id: user.id } }
      );
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal error " + error.message,
    });
  }
};
const logout = async (req, res) => {
  res.status(200).json({ message: "Logout successful" });
};

const authController = { signUp, login };

export default authController;
