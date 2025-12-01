import express from "express";
import { createExamTag } from "../../controllers/examTag/createExamTag.js";
import { getExamTags } from "../../controllers/examTag/getExamTags.js";
import { getExamTagById } from "../../controllers/examTag/getExamTagById.js";
import { updateExamTag } from "../../controllers/examTag/updateExamTag.js";
import { deleteExamTag } from "../../controllers/examTag/deleteExamTag.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";
const router = express.Router();

router.post("/create", requireNormalOrSuper, createExamTag);
router.get("/", requireNormalOrSuper, getExamTags);
router.get("/:id", requireNormalOrSuper, getExamTagById);
router.put("/:id", requireNormalOrSuper,updateExamTag);
router.delete("/:id", requireNormalOrSuper,deleteExamTag);

export default router;
