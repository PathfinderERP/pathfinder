import express from "express";
import { 
    getDailyTracking, 
    getDailyCenterDetails, 
    getDailyUserActivity, 
    exportCenterPerformanceExcel, 
    getDailyTrackingDetails, 
    exportUserCallingReportExcel,
    getDailyCallsReport,
    exportDailyCallsReportSummaryExcel,
    exportDailyCallsReportBulkExcel,
    getDailyUserWalkIns,
    getDailyUserAdmissions
} from "../../controllers/Operations/dailyTrackingController.js";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyTracking);
router.get("/details", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyTrackingDetails);

router.get("/calls-report", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyCallsReport);
router.get("/calls-report/export", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), exportDailyCallsReportSummaryExcel);
router.get("/calls-report/export-bulk", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), exportDailyCallsReportBulkExcel);

router.get("/export/:centerId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), exportCenterPerformanceExcel);
router.get("/user/export/:userId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), exportUserCallingReportExcel);
router.get("/:centerId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyCenterDetails);
router.get("/user/:userId", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyUserActivity);
router.get("/user/:userId/walk-ins", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyUserWalkIns);
router.get("/user/:userId/admissions", protect, requireGranularPermission("trackingFlagging", "dailyCenterTracking", "view"), getDailyUserAdmissions);

export default router;
