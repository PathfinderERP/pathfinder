
import express from "express";
import { chatWithAI } from "../controllers/ai.controller.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected route so only staff can chat with AI
router.post("/chat", protect, chatWithAI);

export default router;
