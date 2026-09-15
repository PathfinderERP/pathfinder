import express from "express";
import {
    createTrainTiming,
    getAllTrainTimings,
    getTrainTimingById,
    updateTrainTiming,
    deleteTrainTiming,
    bulkImportTrainTimings
} from "../../controllers/Academics/teacherTrainTimingController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createTrainTiming);
router.get("/", protect, getAllTrainTimings);
router.get("/:id", protect, getTrainTimingById);
router.put("/:id", protect, updateTrainTiming);
router.delete("/:id", protect, deleteTrainTiming);
router.post("/bulk-import", protect, bulkImportTrainTimings);

export default router;
