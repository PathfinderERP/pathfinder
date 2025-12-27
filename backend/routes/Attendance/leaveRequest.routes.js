const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const leaveRequestController = require('../../controllers/Attendance/leaveRequestController');

// Get all leave requests (for HR)
router.get('/', authMiddleware, leaveRequestController.getAllLeaveRequests);

// Get my leave requests (for employee)
router.get('/my-requests', authMiddleware, leaveRequestController.getMyLeaveRequests);

// Create leave request (employee)
router.post('/', authMiddleware, leaveRequestController.createLeaveRequest);

// Update leave request status (HR)
router.put('/:id/status', authMiddleware, leaveRequestController.updateLeaveRequestStatus);

// Delete leave request
router.delete('/:id', authMiddleware, leaveRequestController.deleteLeaveRequest);

module.exports = router;
