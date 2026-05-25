import express from "express";
import { getDailyTracking, getDailyCenterDetails, getDailyUserActivity, exportCenterPerformanceExcel, getDailyTrackingDetails } from "../../controllers/Operations/dailyTrackingController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDailyTracking);
router.get("/details", protect, getDailyTrackingDetails);
router.get("/export/:centerId", protect, exportCenterPerformanceExcel);
router.get("/:centerId", protect, getDailyCenterDetails);
router.get("/user/:userId", protect, getDailyUserActivity);

export default router;
