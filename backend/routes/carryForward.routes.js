import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    getCarryForwardStudents,
    getCarryForwardStudentDetails,
    searchEnrolledStudent,
    getPendingCarryForwardReport,
    saveCarryForwardRemark
} from '../controllers/carryForwardController.js';

const router = express.Router();

router.get('/students', authMiddleware, getCarryForwardStudents);
router.get('/student-details/:studentId', authMiddleware, getCarryForwardStudentDetails);
router.get('/search-enrolled', authMiddleware, searchEnrolledStudent);
router.get('/pending-report', authMiddleware, getPendingCarryForwardReport);
router.post('/remarks', authMiddleware, saveCarryForwardRemark);

export default router;
