import express from "express";
import { getCEOAnalytics } from "../controllers/ceoControlTowerController.js";
import { requireAuth } from "../middleware/permissionMiddleware.js";

const router = express.Router();

const authorizeSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === "superAdmin") {
        next();
    } else {
        res.status(403).json({ success: false, message: "Forbidden: SuperAdmin access required" });
    }
};

router.get("/analytics", requireAuth, authorizeSuperAdmin, getCEOAnalytics);

export default router;
