import { hash } from "../utils/password.js";
// import User from "../models";
const signUp = async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const password_hash = await hash(password);
  const newUser = {
    full_name: fullName,
    email,
    phone,
    password_hash: hash(password),
  };

  res.status(201).json({ message: "User created successfully", user: newUser });
};
const authController = { signUp };

export default authController;
