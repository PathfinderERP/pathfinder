import LeaveRequest from '../../models/Attendance/LeaveRequest.js';
import Employee from '../../models/HR/Employee.js';
import User from '../../models/User.js';
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// Helper to find employee by user ID or email and link them
const findEmployeeByUser = async (userId) => {
    let employee = await Employee.findOne({ user: userId });

    if (!employee) {
        // Fallback: try to find by email
        const user = await User.findById(userId);
        if (user && user.email) {
            employee = await Employee.findOne({ email: user.email });

            // Auto-link if found matching email
            if (employee && !employee.user) {
                employee.user = userId;
                await employee.save();
            }
        }
    }
    return employee;
};

// Get all leave requests (for HR) or employee's own requests
export const getLeaveRequests = async (req, res) => {
    try {
        const { employeeId, status, startDate, endDate } = req.query;

        let filter = {};

        // If employeeId is provided in query, filter by that employee
        if (employeeId) {
            filter.employee = employeeId;
        } else {
            // If no params and user is HR, do they want ALL? 
            // LeaveRequest.jsx is for "My Requests".
            // LeaveManagement.jsx calls: /leave-requests?param... -> Expects ALL (filtered).

            // So:
            // If `req.query` is empty (Object.keys(req.query).length === 0), it's likely "My Requests".
            // But checking `employeeId` property existence is safer.

            // Let's rely on:
            // HR "Leave Management" sends query params (even if empty strings).
            // "Leave Request" page sends NO query params.

            if (Object.keys(req.query).length === 0) {
                const employee = await findEmployeeByUser(req.user.id);
                if (employee) {
                    filter.employee = employee._id;
                } else {
                    // User is not an employee, returns []
                    return res.json([]);
                }
            }
        }

        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = new Date(startDate);
            if (endDate) filter.startDate.$lte = new Date(endDate);
        }

        const requests = await LeaveRequest.find(filter)
            .populate('employee', 'name employeeId email profileImage')
            .populate('leaveType', 'name days')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 });

        // Sign profile images
        const signedRequests = await Promise.all(requests.map(async (request) => {
            const reqObj = request.toObject();
            if (reqObj.employee && reqObj.employee.profileImage) {
                reqObj.employee.profileImage = await getSignedFileUrl(reqObj.employee.profileImage);
            }
            return reqObj;
        }));

        res.json(signedRequests);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ message: 'Error fetching leave requests', error: error.message });
    }
};

// Create leave request (employee)
export const createLeaveRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { leaveType, startDate, endDate, days, reason } = req.body;

        // Find employee by user ID or auto-link by email
        const employee = await findEmployeeByUser(userId);

        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found. Please ensure your email matches your employee record.' });
        }

        const leaveRequest = new LeaveRequest({
            employee: employee._id,
            leaveType,
            startDate,
            endDate,
            days,
            reason,
            status: 'Pending'
        });

        await leaveRequest.save();

        const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
            .populate('leaveType', 'name days')
            .populate('employee', 'name employeeId email profileImage');

        res.status(201).json(populatedRequest);
    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ message: 'Error creating leave request', error: error.message });
    }
};

// Update leave request status (HR)
export const updateLeaveRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewRemark } = req.body;
        const reviewerId = req.user.id;

        const leaveRequest = await LeaveRequest.findByIdAndUpdate(
            id,
            {
                status,
                reviewRemark,
                reviewedBy: reviewerId,
                reviewedAt: new Date()
            },
            { new: true }
        )
            .populate('employee', 'name employeeId email profileImage')
            .populate('leaveType', 'name days')
            .populate('reviewedBy', 'name email');

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        res.json(leaveRequest);
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ message: 'Error updating leave request', error: error.message });
    }
};

// Delete leave request
export const deleteLeaveRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const leaveRequest = await LeaveRequest.findByIdAndDelete(id);

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
        console.error('Error deleting leave request:', error);
        res.status(500).json({ message: 'Error deleting leave request', error: error.message });
    }
};
