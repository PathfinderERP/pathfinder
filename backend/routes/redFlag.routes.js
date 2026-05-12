import express from "express";
import { getRedFlags, getRedFlagStats, updateRedFlag, generateRedFlags } from "../controllers/redFlagController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getRedFlags);
router.get("/stats", protect, getRedFlagStats);
router.put("/:id", protect, updateRedFlag);
router.post("/generate", protect, generateRedFlags);

export default router;
