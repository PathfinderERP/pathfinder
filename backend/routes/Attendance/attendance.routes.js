import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import {
    createHoliday,
    getHolidays,
    updateHoliday,
    deleteHoliday
} from '../../controllers/Attendance/holidayController.js';
import {
    createLeaveType,
    getLeaveTypes,
    updateLeaveType,
    deleteLeaveType
} from '../../controllers/Attendance/leaveTypeController.js';
import {
    createLeaveRequest,
    getLeaveRequests,
    updateLeaveRequestStatus,
    deleteLeaveRequest
} from '../../controllers/Attendance/leaveRequestController.js';
import {
    createRegularization,
    getRegularizations,
    updateRegularizationStatus,
    deleteRegularization
} from '../../controllers/Attendance/regularizationController.js';

const router = express.Router();

router.use(authMiddleware);

// Holiday Routes
router.post('/holidays', createHoliday);
router.get('/holidays', getHolidays);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Leave Type Routes
router.post('/leave-types', createLeaveType);
router.get('/leave-types', getLeaveTypes);
router.put('/leave-types/:id', updateLeaveType);
router.delete('/leave-types/:id', deleteLeaveType);

// Leave Request Routes
router.post('/leave-requests', createLeaveRequest);
router.get('/leave-requests', getLeaveRequests);
router.patch('/leave-requests/:id/status', updateLeaveRequestStatus);
router.delete('/leave-requests/:id', deleteLeaveRequest);

// Regularization Routes
router.post('/regularizations', createRegularization);
router.get('/regularizations', getRegularizations);
router.patch('/regularizations/:id/status', updateRegularizationStatus);
router.delete('/regularizations/:id', deleteRegularization);

export default router;
