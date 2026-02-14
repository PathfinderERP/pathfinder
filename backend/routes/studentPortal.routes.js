import express from "express";
import { login, getProfile, getClasses, getAttendance } from "../controllers/studentPortalController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/login", login);

// Protected Routes
router.get("/profile", protect, getProfile);
router.get("/classes", protect, getClasses);
router.get("/attendance", protect, getAttendance);

export default router;
