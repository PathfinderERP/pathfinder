import express from "express";
import {
    createClassSchedule,
    getClassSchedules,
    getClassDropdownData
} from "../../controllers/Academics/classScheduleController.js";
import verifyToken from "../../middleware/authMiddleware.js"; // Assuming auth middleware exists

const router = express.Router();

router.post("/create", verifyToken, createClassSchedule);
router.get("/list", verifyToken, getClassSchedules);
router.get("/dropdown-data", verifyToken, getClassDropdownData);

export default router;
