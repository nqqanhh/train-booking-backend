import { hash, comparePassword } from "../utils/password.js";
// import user from "../models/user.js";
import db from "../../models/index.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import bcrypt from "bcrypt";

const { User } = db;

const toSafeUser = (u) => ({
  id: u.id,
  full_name: u.full_name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  status: u.status,
});

const signUp = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    const isExist = await User.findOne({ where: { email } });
    if (isExist)
      return res.json({
        message: "this Email is exist",
      });
    const password_hash = await hash(password);
    const newUser = {
      full_name: fullName,
      email,
      phone,
      password_hash: password_hash,
    };
    await User.create(newUser);
    const getUserInfo = await User.findOne({ where: { email: email } });
    res.status(201).json({
      message: "User created successfully",
      id: getUserInfo.id,
      user: newUser,
    });
  } catch (error) {
    console.error("Signup error:", {
      message: error.message,
      sql: error?.sql,
      sqlMessage: error?.original?.sqlMessage,
    });
    return res.status(500).json({
      message: "Lỗi server",
      detail: error?.original?.sqlMessage || error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    let { email, phone, password } = req.body || {};

    if (!password || (!email && !phone)) {
      return res.status(400).json({ message: "Thiếu password và email/phone" });
    }

    // Ưu tiên email nếu gửi cả hai
    let where;
    if (email) {
      email = String(email).trim().toLowerCase();
      where = { email };
    } else {
      phone = String(phone).trim();
      where = { phone };
    }

    const user = await User.findOne({ where });
    // Không tiết lộ "email có/không", trả lỗi chung
    if (!user)
      return res.status(401).json({ message: "Sai thông tin đăng nhập" });

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
      phone: user?.phone || "Chua co sdt",
      email: user?.email || "Chua co email",
      role: user.role,
      status: user.status,
    };
    const access_token = signAccessToken(payload);
    const refresh_token =
      typeof signRefreshToken === "function"
        ? signRefreshToken(payload)
        : undefined;

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
      detail: error?.original?.sqlMessage || error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {

    const { oldPass, newPass } = req.body;
    if (!oldPass || !newPass)
      return res.status(404).json({
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
      sqlMessage: error.sql,
    });
  }
};
const logout = async (req, res) => {
  res.status(200).json({ message: "Logout successful" });
};

const authController = { signUp, login };

export default authController;
