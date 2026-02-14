import express from "express";
import { createTopic, getAllTopics, getTopicsByChapter, updateTopic, deleteTopic, bulkImportTopics, deleteMultipleTopics } from "../../controllers/Academics/Academics_topicController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createTopic);
router.post("/bulk-import", authMiddleware, bulkImportTopics);
router.post("/delete-multiple", authMiddleware, deleteMultipleTopics);
router.get("/list", authMiddleware, getAllTopics);
router.get("/list/chapter/:chapterId", authMiddleware, getTopicsByChapter);
router.put("/update/:id", authMiddleware, updateTopic);
router.delete("/delete/:id", authMiddleware, deleteTopic);

export default router;
