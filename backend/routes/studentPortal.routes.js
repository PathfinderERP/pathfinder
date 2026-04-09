import express from "express";
import { login, getProfile, getClasses, getUpcomingClasses, getOngoingClasses, getAttendance, getTeachers, getSingleStudentReport } from "../controllers/studentPortalController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/login", login);

// Protected Routes
router.get("/profile", protect, getProfile);
router.get("/classes", protect, getClasses);
router.get("/classes/:studentId", protect, getClasses);
router.get("/classes/upcoming", protect, getUpcomingClasses);
router.get("/classes/upcoming/:studentId", protect, getUpcomingClasses);
router.get("/classes/ongoing", protect, getOngoingClasses);
router.get("/classes/ongoing/:studentId", protect, getOngoingClasses);
router.get("/attendance", protect, getAttendance);
router.get("/report", protect, getSingleStudentReport);
router.get("/report/:studentId", protect, getSingleStudentReport);
router.get("/teachers", protect, getTeachers);

export default router;
