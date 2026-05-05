import jwt from "jsonwebtoken";
import { requireNormalAdmin } from "./requireNormalAdmin.js";
import { requireSuperAdmin } from "./requireSuperAdmin.js";

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === "student") {
      const Student = (await import("../models/Students.js")).default;
      const student = await Student.findById(decoded.id);
      if (!student) return res.status(401).json({ message: "User not found" });
      req.user = student;
      req.user.role = "student";
      return next();
    }

    const User = (await import("../models/User.js")).default;
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

export const requireNormalOrSuper = (req, res, next) => {
  requireNormalAdmin(req, res, (err) => {
    if (!err) return next(); // Normal admin allowed

    // If normal admin fails, try super admin:
    requireSuperAdmin(req, res, (err2) => {
      if (!err2) return next(); // Super admin allowed

      return res.status(403).json({ message: "Access denied. Admin level required." });
    });
  });
};

export default authMiddleware;