import express from "express";
import { createTopic, getAllTopics, updateTopic, deleteTopic } from "../../controllers/Academics/Academics_topicController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createTopic);
router.get("/list", authMiddleware, getAllTopics);
router.put("/update/:id", authMiddleware, updateTopic);
router.delete("/delete/:id", authMiddleware, deleteTopic);

export default router;
