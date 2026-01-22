import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import {
    markAttendance,
    getMyAttendance,
    getAllAttendance,
    getAttendanceAnalysis,
    getAttendanceDashboardStats,
    manualMarkAttendance,
    bulkImportAttendance
} from "../../controllers/Attendance/employeeAttendanceController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Employee routes
router.post("/mark", markAttendance);
router.get("/my-history", getMyAttendance);
router.get("/analysis", getAttendanceAnalysis);

// HR/Admin routes
router.get("/dashboard-stats", getAttendanceDashboardStats);
router.get("/all", getAllAttendance);
router.post("/manual-mark", manualMarkAttendance);
router.post("/bulk-import", bulkImportAttendance);

export default router;
