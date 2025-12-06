import express from "express";
import { createExamTag } from "../../controllers/examTag/createExamTag.js";
import { getExamTags } from "../../controllers/examTag/getExamTags.js";
import { getExamTagById } from "../../controllers/examTag/getExamTagById.js";
import { updateExamTag } from "../../controllers/examTag/updateExamTag.js";
import { deleteExamTag } from "../../controllers/examTag/deleteExamTag.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getExamTags);
router.get("/:id", requireAuth, getExamTagById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("masterData", "examTag", "create"), createExamTag);
router.put("/:id", requireGranularPermission("masterData", "examTag", "edit"), updateExamTag);
router.delete("/:id", requireGranularPermission("masterData", "examTag", "delete"), deleteExamTag);

export default router;
