
import express from "express";
import { chatWithAI, analyseERP, getStudentInsight } from "../controllers/ai.controller.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * POST /api/ai/chat
 * General ERP chatbot — answers any question by fetching live ERP data.
 * Body: { message: string, context: string (optional, current page path) }
 */
router.post("/chat", protect, chatWithAI);

/**
 * POST /api/ai/analyse
 * Deep analytical queries with date range & centre filters.
 * Body: { question, module?, startDate?, endDate?, centre? }
 */
router.post("/analyse", protect, analyseERP);

/**
 * POST /api/ai/student-insight
 * AI-powered insight for a specific student.
 * Body: { studentId? } or { admissionId? }
 */
router.post("/student-insight", protect, getStudentInsight);

export default router;
