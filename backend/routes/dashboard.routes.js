import express from "express";
import { getDashboardAnalytics, getCentreAnalytics } from "../controllers/dashboardController.js";
import { requireAuth } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// Get dashboard analytics
router.get("/analytics", requireAuth, getDashboardAnalytics);

// Get specific centre analytics
router.get("/centre/:centreId", requireAuth, getCentreAnalytics);

export default router;
