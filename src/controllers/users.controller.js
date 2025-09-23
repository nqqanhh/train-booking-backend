import { compare, hash } from "bcrypt";
import db from "../models/index.js";
const { User } = db;
const getMyProfile = async (req, res) => {
  // Assuming req.user is populated by authentication middleware
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.status(200).json({ user });
};

const updateMyProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    // Update user fields
    if (fullName) user.full_name = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    await User.update(
      { full_name: user.full_name, phone: user.phone, email: user.email },
      { where: { id: req.user.id } }
    );
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
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

const userController = { getMyProfile, updateMyProfile, changePassword };
export default userController;
