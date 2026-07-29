import express from "express";
import {
    createSchoolForTask,
    getSchoolsForTask,
    getSchoolForTaskById,
    updateSchoolForTask,
    deleteSchoolForTask,
    bulkDeleteSchoolsForTask,
    bulkUpdateSchoolsForTask,
    bulkImportSchoolsForTask,
    getSchoolForTaskDistinctFields,
} from "../../controllers/masterData/schoolForTaskController.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// ── Utility ───────────────────────────────────────────
router.get("/distinct-fields", requireAuth, getSchoolForTaskDistinctFields);

// ── CRUD ──────────────────────────────────────────────
router.get("/",     requireAuth, getSchoolsForTask);
router.get("/:id",  requireAuth, getSchoolForTaskById);
router.post("/",    requireAuth, createSchoolForTask);
router.put("/:id",  requireAuth, updateSchoolForTask);
router.delete("/:id", requireAuth, deleteSchoolForTask);

// ── Bulk operations ───────────────────────────────────
router.post("/bulk-import", requireAuth, bulkImportSchoolsForTask);
router.post("/bulk-delete", requireAuth, bulkDeleteSchoolsForTask);
router.put("/bulk-update",  requireAuth, bulkUpdateSchoolsForTask);

export default router;
