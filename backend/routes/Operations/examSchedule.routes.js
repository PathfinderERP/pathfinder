import express from "express";
import {
    requireAuth,
    requireGranularPermission
} from "../../middleware/permissionMiddleware.js";
import {
    getExamSchedules,
    getExamScheduleById,
    createExamSchedule,
    updateExamSchedule,
    deleteExamSchedule,
    bulkDeleteExamSchedules,
    importExamSchedules,
    exportExamSchedules
} from "../../controllers/Operations/examScheduleController.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/operations/exam-schedule - List schedules with filters and pagination
router.get(
    "/",
    requireGranularPermission("operations", "examSchedule", "view"),
    getExamSchedules
);

// GET /api/operations/exam-schedule/export - Export matching exam schedules
router.get(
    "/export",
    requireGranularPermission("operations", "examSchedule", "view"),
    exportExamSchedules
);

// GET /api/operations/exam-schedule/:id - Single exam schedule
router.get(
    "/:id",
    requireGranularPermission("operations", "examSchedule", "view"),
    getExamScheduleById
);

// POST /api/operations/exam-schedule - Create exam schedule
router.post(
    "/",
    requireGranularPermission("operations", "examSchedule", "create"),
    createExamSchedule
);

// POST /api/operations/exam-schedule/import - Bulk import exam schedules from Excel/CSV
router.post(
    "/import",
    requireGranularPermission("operations", "examSchedule", "create"),
    importExamSchedules
);

// PUT /api/operations/exam-schedule/:id - Update exam schedule
router.put(
    "/:id",
    requireGranularPermission("operations", "examSchedule", "edit"),
    updateExamSchedule
);

// DELETE /api/operations/exam-schedule/:id - Delete single exam schedule
router.delete(
    "/:id",
    requireGranularPermission("operations", "examSchedule", "delete"),
    deleteExamSchedule
);

// POST /api/operations/exam-schedule/bulk-delete - Bulk delete exam schedules
router.post(
    "/bulk-delete",
    requireGranularPermission("operations", "examSchedule", "delete"),
    bulkDeleteExamSchedules
);

export default router;
