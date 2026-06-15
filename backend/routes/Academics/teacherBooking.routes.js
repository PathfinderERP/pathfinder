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

const router = express.Router();

router.get("/for-telecaller", protect, getTeacherScheduleForTelecaller);
router.get("/for-teacher", protect, getBookingsForTeacher);
router.get("/all", protect, getAllBookings);
router.post("/", protect, bookTeacherSlot);
router.put("/:id", protect, updateBooking);
router.delete("/:id", protect, deleteBooking);

export default router;
