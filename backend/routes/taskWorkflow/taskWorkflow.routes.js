import express from "express";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
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

router.post("/tasks", protect, requireGranularPermission("taskWorkflow", "assignTask", "create"), createTask);
router.get("/tasks", protect, requireGranularPermission("taskWorkflow", "tasks", "view"), getTasks);
router.get("/tasks/unviewed-count", protect, requireGranularPermission("taskWorkflow", "tasks", "view"), getUnviewedTasksCount);
router.put("/tasks/mark-viewed", protect, requireGranularPermission("taskWorkflow", "tasks", "view"), markTasksAsViewed);
router.put("/tasks/:id", protect, requireGranularPermission("taskWorkflow", "assignTask", "edit"), updateTask);
router.patch("/tasks/:id/status", protect, requireGranularPermission("taskWorkflow", "tasks", "view"), updateTaskStatus);
router.post("/tasks/:id/comments", protect, requireGranularPermission("taskWorkflow", "tasks", "view"), addComment);
router.delete("/tasks/:id", protect, requireGranularPermission("taskWorkflow", "assignTask", "delete"), deleteTask);

export default router;
