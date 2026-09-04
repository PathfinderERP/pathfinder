import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    getCarryForwardStudents,
    getCarryForwardStudentDetails,
    searchEnrolledStudent,
    getPendingCarryForwardReport
} from '../controllers/carryForwardController.js';

const router = express.Router();

router.get('/students', authMiddleware, getCarryForwardStudents);
router.get('/student-details/:studentId', authMiddleware, getCarryForwardStudentDetails);
router.get('/search-enrolled', authMiddleware, searchEnrolledStudent);
router.get('/pending-report', authMiddleware, getPendingCarryForwardReport);

export default router;
