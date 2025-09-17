import { verifyAccessToken } from "../utils/jwt";

const authorizationToken = (req, res, next) => {
  try {
    const header = req.header.authorization || "";
    const token = header.startsWith(`Bearer`) ? header.slice(7) : null;
    if (!token)
      return res.status(401).json({
        message: "missing tokens",
      });
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next;
  } catch (error) {
    return res.status(401).json({
      message: "ivalid or expired token",
      Err: error,
    });
  }
};
