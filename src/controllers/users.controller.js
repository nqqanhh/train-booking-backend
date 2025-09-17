import db from "../../models/index.js";
import user from "../../models/user.js";
const getMyProfile = async (req, res) => {
  // Assuming req.user is populated by authentication middleware
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.status(200).json({ user });
};

const updateMyProfile = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { fullName, email, phone } = req.body;
  // Update user fields
  if (fullName) user.full_name = fullName;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  await user.save();
  res.status(200).json({ message: "Profile updated successfully", user });
};

const userController = { getMyProfile, updateMyProfile };
export default userController;
