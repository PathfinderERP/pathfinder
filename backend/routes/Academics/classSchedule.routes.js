import express from "express";
import {
    createClassSchedule,
    getClassSchedules,
    getClassDropdownData,
    startClass,
    endClass,
    deleteClassSchedule,
    submitFeedback,
    markTeacherAttendance
} from "../../controllers/Academics/classScheduleController.js";
import verifyToken from "../../middleware/authMiddleware.js"; // Assuming auth middleware exists

const router = express.Router();

router.post("/create", verifyToken, createClassSchedule);
router.get("/list", verifyToken, getClassSchedules);
router.get("/dropdown-data", verifyToken, getClassDropdownData);
router.put("/start/:id", verifyToken, startClass);
router.put("/end/:id", verifyToken, endClass);
router.delete("/delete/:id", verifyToken, deleteClassSchedule);
router.put("/feedback/:id", verifyToken, submitFeedback);
router.put("/mark-attendance/:id", verifyToken, markTeacherAttendance);

export default router;
