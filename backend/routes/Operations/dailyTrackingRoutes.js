import express from "express";
import { getDailyTracking, getDailyCenterDetails, getDailyUserActivity, exportCenterPerformanceExcel, getDailyTrackingDetails, exportUserCallingReportExcel } from "../../controllers/Operations/dailyTrackingController.js";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyTracking);
router.get("/details", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyTrackingDetails);
router.get("/export/:centerId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), exportCenterPerformanceExcel);
router.get("/user/export/:userId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), exportUserCallingReportExcel);
router.get("/:centerId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyCenterDetails);
router.get("/user/:userId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyUserActivity);

export default router;
