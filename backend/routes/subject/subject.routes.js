import express from "express";
import {
    createSubject,
    getAllSubjects,
    updateSubject,
    deleteSubject,
} from "../../controllers/subject/subjectController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Subject from "../../models/Master_data/Subject.js";

const router = express.Router();

router.get("/", requireAuth, getAllSubjects);
router.post("/", requireGranularPermission("masterData", "subject", "create"), createSubject);
router.post("/import", requireGranularPermission("masterData", "subject", "create"), bulkImport(Subject));
router.put("/:id", requireGranularPermission("masterData", "subject", "edit"), updateSubject);
router.delete("/:id", requireGranularPermission("masterData", "subject", "delete"), deleteSubject);

export default router;
