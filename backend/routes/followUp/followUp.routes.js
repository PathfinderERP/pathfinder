import express from "express";
import {
    addFollowUp,
    getFollowUps,
    deleteFollowUp,
} from "../../controllers/followUp/followUpController.js";

const router = express.Router();

// POST /api/follow-up/ — log a new call
router.post("/", addFollowUp);

// GET /api/follow-up/:studentType/:studentId — get history for a student
router.get("/:studentType/:studentId", getFollowUps);

// DELETE /api/follow-up/:id — delete a single entry
router.delete("/:id", deleteFollowUp);

export default router;
