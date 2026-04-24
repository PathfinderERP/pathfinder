import express from "express";
import { getSystemLogs, getLogStats } from "../controllers/SystemLogController.js";
import { requireAuth } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// Only SuperAdmin should be able to see logs
const requireSuperAdmin = (req, res, next) => {
    if (req.user && (req.user.role?.toLowerCase() === "superadmin" || req.user.role?.toLowerCase() === "super admin")) {
        next();
    } else {
        res.status(403).json({ message: "Access denied. SuperAdmin required." });
    }
};

router.get("/all", requireAuth, requireSuperAdmin, getSystemLogs);
router.get("/stats", requireAuth, requireSuperAdmin, getLogStats);

export default router;
