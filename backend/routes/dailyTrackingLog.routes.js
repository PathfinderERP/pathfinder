import express from "express";
import { 
    addOrUpdateActivity, 
    getMyLog, 
    getDepartmentLogs, 
    updateActivity, 
    deleteActivity 
} from "../controllers/dailyTrackingLogController.js";
import protect from "../middleware/authMiddleware.js";
import { requireGranularPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.post("/", protect, requireGranularPermission("dailyTrackingLog", "myDailyLog", "create"), addOrUpdateActivity);
router.get("/my-log", protect, requireGranularPermission("dailyTrackingLog", "myDailyLog", "view"), getMyLog);
router.get("/board", requireGranularPermission("dailyTrackingLog", "logTracking", "view"), getDepartmentLogs);
router.put("/:logId/activity/:activityId", protect, requireGranularPermission("dailyTrackingLog", "myDailyLog", "edit"), updateActivity);
router.delete("/:logId/activity/:activityId", protect, requireGranularPermission("dailyTrackingLog", "myDailyLog", "delete"), deleteActivity);

export default router;
