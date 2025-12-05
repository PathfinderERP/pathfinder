import express from "express";
import { createExamTag } from "../../controllers/examTag/createExamTag.js";
import { getExamTags } from "../../controllers/examTag/getExamTags.js";
import { getExamTagById } from "../../controllers/examTag/getExamTagById.js";
import { updateExamTag } from "../../controllers/examTag/updateExamTag.js";
import { deleteExamTag } from "../../controllers/examTag/deleteExamTag.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// All exam tag routes require "Master Data" permission
router.post("/create", requirePermission("Master Data"), createExamTag);
router.get("/", requirePermission("Master Data"), getExamTags);
router.get("/:id", requirePermission("Master Data"), getExamTagById);
router.put("/:id", requirePermission("Master Data"), updateExamTag);
router.delete("/:id", requirePermission("Master Data"), deleteExamTag);

export default router;
