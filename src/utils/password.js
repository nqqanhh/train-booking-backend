import bcript from "bcrypt";
const saltRounds = 10;
export const hash = async (password) => {
  const salt = await bcript.genSalt(saltRounds);
  const hashPassword = await bcript.hash(password, salt);
  return hashPassword;
};
export const comparePassword = async (password, hashPassword) => {
  bcript.compare(password, hashPassword);
};
