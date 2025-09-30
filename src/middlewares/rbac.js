export const isAdmin = (req, res, next) => {
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ message: "forbiden" });
};

export const isOwnerOrAdmin = (getOwnerId) => async (req, res, next) => {
  if (req.user?.role === "admin") return next();
  try {
    const ownerId = await getOwnerId(req);
    if (String(ownerId) === String(req.user?.id)) return next();
    return res.status(403).json({ message: "forbidden" });
  } catch (e) {
    return res.status(500).json({ message: "Error checking ownership" });
  }
};
