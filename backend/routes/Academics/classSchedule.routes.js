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
    startStudy,
    updateClassSchedule
} from "../../controllers/Academics/classScheduleController.js";
import {
    getStudentsForAttendance,
    saveStudentAttendance
} from "../../controllers/Academics/studentAttendanceController.js";
import { requireGranularPermission, requireAuth } from "../../middleware/permissionMiddleware.js";
import verifyToken from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", requireGranularPermission("academics", "classes", "create"), createClassSchedule);
router.get("/list", requireGranularPermission("academics", "classes", "view"), getClassSchedules);
router.get("/dropdown-data", requireAuth, getClassDropdownData);
router.put("/start/:id", requireGranularPermission("academics", "classes", "edit"), startClass);
router.put("/end/:id", requireGranularPermission("academics", "classes", "edit"), endClass);
router.delete("/delete/:id", requireGranularPermission("academics", "classes", "delete"), deleteClassSchedule);
router.put("/update/:id", requireGranularPermission("academics", "classes", "edit"), updateClassSchedule);
router.put("/feedback/:id", verifyToken, submitFeedback);
router.put("/mark-attendance/:id", verifyToken, markTeacherAttendance);
router.put("/start-study/:id", verifyToken, startStudy);

// Student Attendance
router.get("/student-attendance/:classScheduleId", verifyToken, getStudentsForAttendance);
router.post("/student-attendance/save/:classScheduleId", verifyToken, saveStudentAttendance);

export default router;
