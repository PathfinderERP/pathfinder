import express from "express";
import {
    createAssignedTask,
    getMyAssignedTasks,
    getAllAssignedTasks,
    getAssignableStaff,
    updateAssignedTask,
    deleteAssignedTask,
} from "../controllers/assignedTaskController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Fetch staff that can be assigned tasks ────────────────────
router.get("/staff", protect, getAssignableStaff);

// ── Tasks assigned TO the logged-in user (for Today/Tomorrow) ─
router.get("/my-tasks", protect, getMyAssignedTasks);

// ── Admin: all assigned tasks (with filters) ──────────────────
router.get("/", protect, getAllAssignedTasks);

// ── Create a new assigned task (super admin) ──────────────────
router.post("/", protect, createAssignedTask);

// ── Update an assigned task ───────────────────────────────────
router.put("/:id", protect, updateAssignedTask);

// ── Delete an assigned task ───────────────────────────────────
router.delete("/:id", protect, deleteAssignedTask);

export default router;
