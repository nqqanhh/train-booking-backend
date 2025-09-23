export const isAdmin = (req, res, next) => {
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ message: "forbiden" });
};

export const isOwnerOrAdmin = (getOwnerId) => (req, res, next) => {
  if (req.user?.role === "admin") return next();
  const ownerId = getOwnerId(req);
  if (String(ownerId) === String(req.user?.id)) return next();
  return res.status(403).json({ message: "forbiden" });
};
