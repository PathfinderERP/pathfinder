import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    getCarryForwardStudents,
    getCarryForwardStudentDetails,
    searchEnrolledStudent
} from '../controllers/carryForwardController.js';

const router = express.Router();

router.get('/students', authMiddleware, getCarryForwardStudents);
router.get('/student-details/:studentId', authMiddleware, getCarryForwardStudentDetails);
router.get('/search-enrolled', authMiddleware, searchEnrolledStudent);

export default router;
