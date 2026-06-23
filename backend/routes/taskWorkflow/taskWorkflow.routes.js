import express from "express";
import protect from "../../middleware/authMiddleware.js";
import { requireSuperAdmin } from "../../middleware/requireSuperAdmin.js";
import {
    createTask,
    getTasks,
    updateTaskStatus,
    addComment,
    deleteTask,
    markTasksAsViewed,
    getUnviewedTasksCount,
    updateTask
} from "../../controllers/taskWorkflow/taskWorkflow.controller.js";

const router = express.Router();

router.post("/tasks", protect, requireSuperAdmin, createTask);
router.get("/tasks", protect, getTasks);
router.get("/tasks/unviewed-count", protect, getUnviewedTasksCount);
router.put("/tasks/mark-viewed", protect, markTasksAsViewed);
router.put("/tasks/:id", protect, requireSuperAdmin, updateTask);
router.patch("/tasks/:id/status", protect, updateTaskStatus);
router.post("/tasks/:id/comments", protect, addComment);
router.delete("/tasks/:id", protect, requireSuperAdmin, deleteTask);

export default router;
