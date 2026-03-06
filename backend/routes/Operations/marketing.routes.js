import express from "express";
import { createRequirement, getRequirements } from "../../controllers/Operations/marketingController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createRequirement);
router.get("/", protect, getRequirements);

export default router;
