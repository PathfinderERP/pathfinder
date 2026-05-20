import express from "express";
import { 
    addOrUpdateActivity, 
    getMyLog, 
    getDepartmentLogs, 
    updateActivity, 
    deleteActivity 
} from "../controllers/dailyTrackingLogController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, addOrUpdateActivity);
router.get("/my-log", protect, getMyLog);
router.get("/board", protect, getDepartmentLogs);
router.put("/:logId/activity/:activityId", protect, updateActivity);
router.delete("/:logId/activity/:activityId", protect, deleteActivity);

export default router;
