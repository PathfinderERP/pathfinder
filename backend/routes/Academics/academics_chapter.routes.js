import express from "express";
import { createChapter, getAllChapters, getChaptersBySubject, updateChapter, deleteChapter } from "../../controllers/Academics/Academics_chapterController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createChapter);
router.get("/list", authMiddleware, getAllChapters);
router.get("/list/subject/:subjectId", authMiddleware, getChaptersBySubject); // Fetch by subject
router.put("/update/:id", authMiddleware, updateChapter);
router.delete("/delete/:id", authMiddleware, deleteChapter);

export default router;
