import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import {
    markAttendance,
    getMyAttendance,
    getAllAttendance,
    getAttendanceAnalysis,
    getAttendanceDashboardStats
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

export default router;
