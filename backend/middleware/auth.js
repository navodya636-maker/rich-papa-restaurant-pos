const jwt = require("jsonwebtoken");
const { User } = require("../models");

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.active) return res.status(401).json({ message: "User unavailable" });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Permission denied" });

module.exports = { protect, authorize };
