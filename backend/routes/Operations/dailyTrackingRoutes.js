import express from "express";
import { getDailyTracking } from "../../controllers/Operations/dailyTrackingController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDailyTracking);

export default router;
