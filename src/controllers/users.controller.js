// src/controllers/users.controller.js
import { compare, hash } from "bcrypt";
import db from "../models/index.js";
const { User } = db;

const getMyProfile = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  // Có thể nạp lại từ DB để có fields mới nhất
  const me = await User.findByPk(req.user.id, {
    attributes: [
      "id",
      "full_name",
      "email",
      "phone",
      "role",
      "status",
      "createdAt",
      "updatedAt",
    ],
  });
  return res.status(200).json({ profile: me });
};

const updateMyProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body || {};
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (typeof fullName !== "undefined") user.full_name = fullName;
    if (typeof email !== "undefined")
      user.email = String(email).trim().toLowerCase();
    if (typeof phone !== "undefined") user.phone = String(phone).trim();

    await user.save();
    return res
      .status(200)
      .json({ message: "Profile updated successfully", user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal error: " + error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPass, newPass } = req.body || {};
    if (!oldPass || !newPass)
      return res.status(400).json({ message: "Missing credentials" });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await compare(oldPass, user.password_hash);
    if (!ok)
      return res.status(400).json({ message: "Current password is incorrect" });

    const newHash = await hash(newPass, 10);
    user.password_hash = newHash;
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal error " + error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json({
      message: "OK",
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error " + error.message,
    });
  }
};
const userController = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAllUsers,
};
export default userController;
