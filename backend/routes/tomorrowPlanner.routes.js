import express from "express";
import {
    addTask,
    getMyPlan,
    getBoardPlans,
    updateTask,
    deleteTask
} from "../controllers/tomorrowPlannerController.js";
import protect from "../middleware/authMiddleware.js";
import { requireGranularPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// All routes protected — reuse same dailyTrackingLog granular permissions
router.post(
    "/",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "create"),
    addTask
);

router.get(
    "/my-plan",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "view"),
    getMyPlan
);

router.get(
    "/board",
    protect,
    requireGranularPermission("dailyTrackingLog", "logTracking", "view"),
    getBoardPlans
);

router.put(
    "/:planId/task/:taskId",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "edit"),
    updateTask
);

router.delete(
    "/:planId/task/:taskId",
    protect,
    requireGranularPermission("dailyTrackingLog", "myDailyLog", "delete"),
    deleteTask
);

export default router;
