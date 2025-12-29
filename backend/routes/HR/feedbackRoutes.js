import express from "express";
import {
    submitFeedback,
    getMyFeedbacks,
    getAllFeedbacks,
    respondToFeedback
} from "../../controllers/HR/feedbackController.js";
import protect, { requireNormalOrSuper as adminOnly } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/submit", protect, submitFeedback);
router.get("/my", protect, getMyFeedbacks);
router.get("/all", protect, adminOnly, getAllFeedbacks);
router.put("/respond/:id", protect, adminOnly, respondToFeedback);

export default router;
