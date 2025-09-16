import { hashPassword } from "../utils/hashPassword.js";
import user from "../models/user.js";
const signUp = async (req, res) => {
    const {fullName, email, phone, password} = req.body
    const password_hash = await hash(password);
    const newUser = {
        full_name:fullName,
        email,
        phone,
        password_hash: hashPassword(password),
    }
}