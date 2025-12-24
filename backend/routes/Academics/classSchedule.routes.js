import express from "express";
import {
    createClassSchedule,
    getClassSchedules,
    getClassDropdownData,
    startClass,
    endClass,
    deleteClassSchedule,
    submitFeedback,
    markTeacherAttendance,
    startStudy
} from "../../controllers/Academics/classScheduleController.js";
import {
    getStudentsForAttendance,
    saveStudentAttendance
} from "../../controllers/Academics/studentAttendanceController.js";
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
router.put("/start-study/:id", verifyToken, startStudy);

// Student Attendance
router.get("/student-attendance/:classScheduleId", verifyToken, getStudentsForAttendance);
router.post("/student-attendance/save/:classScheduleId", verifyToken, saveStudentAttendance);

export default router;
