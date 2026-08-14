import express from "express";
import {
    createLog,
    getMyLogs,
    getAllUpcomingLogs,
    updateLog,
    deleteLog
} from "../controllers/logCalendarController.js";
import protect from "../middleware/authMiddleware.js";
import { requireGranularPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.post(
    "/",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "create"),
    createLog
);

router.get(
    "/my-logs",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "view"),
    getMyLogs
);

router.get(
    "/board",
    protect,
    requireGranularPermission("dailyTrackingLog", "logTracking", "view"),
    getAllUpcomingLogs
);

router.put(
    "/:id",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "edit"),
    updateLog
);

router.delete(
    "/:id",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "delete"),
    deleteLog
);

export default router;
