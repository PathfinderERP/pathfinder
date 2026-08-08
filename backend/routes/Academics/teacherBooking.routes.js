import express from "express";
import {
    getTeacherScheduleForTelecaller,
    bookTeacherSlot,
    getBookingsForTeacher,
    getAllBookings,
    updateBooking,
    deleteBooking
} from "../../controllers/Academics/teacherBookingController.js";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/for-telecaller", protect, requireGranularPermission("leadManagement", "teacherSchedule", "view"), getTeacherScheduleForTelecaller);
router.get("/for-teacher", protect, requireGranularPermission("leadManagement", "teacherSchedule", "view"), getBookingsForTeacher);
router.get("/all", protect, requireGranularPermission("leadManagement", "teacherSchedule", "view"), getAllBookings);
router.post("/", protect, requireGranularPermission("leadManagement", "teacherSchedule", "create"), bookTeacherSlot);
router.put("/:id", protect, requireGranularPermission("leadManagement", "teacherSchedule", "edit"), updateBooking);
router.delete("/:id", protect, requireGranularPermission("leadManagement", "teacherSchedule", "delete"), deleteBooking);

export default router;
