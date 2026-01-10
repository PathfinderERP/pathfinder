import express from "express";
import { getDashboardAnalytics } from "../controllers/dashboardController.js";
import { requireAuth } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// Get dashboard analytics
router.get("/analytics", requireAuth, getDashboardAnalytics);

export default router;
