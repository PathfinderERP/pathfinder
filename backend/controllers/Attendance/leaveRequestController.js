import LeaveRequest from '../../models/Attendance/LeaveRequest.js';
import LeaveType from '../../models/Attendance/LeaveType.js';
import EmployeeAttendance from '../../models/Attendance/EmployeeAttendance.js';
import Employee from '../../models/HR/Employee.js';
import User from '../../models/User.js';
import { getSignedFileUrl } from "../../utils/r2Upload.js";
import { eachDayOfInterval, startOfDay } from 'date-fns';

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

// Helper to check available leave balance for an employee and leave type
const checkAvailableLeaveBalance = async (employeeId, leaveTypeId, requestingDays, excludeRequestId = null) => {
    const leaveTypeObj = await LeaveType.findById(leaveTypeId);
    if (!leaveTypeObj) {
        return { valid: false, message: 'Leave type not found', availableDays: 0 };
    }

    const employeeObj = await Employee.findById(employeeId);
    let totalQuota = leaveTypeObj.days;

    if (employeeObj && employeeObj.user) {
        const userObj = await User.findById(employeeObj.user).select('role');
        if (userObj && userObj.role === 'teacher' && leaveTypeObj.teacherDays != null) {
            totalQuota = leaveTypeObj.teacherDays;
        }
    }

    const query = {
        employee: employeeId,
        leaveType: leaveTypeId,
        status: 'Approved'
    };
    if (excludeRequestId) {
        query._id = { $ne: excludeRequestId };
    }

    const approvedRequests = await LeaveRequest.find(query);
    const usedDays = approvedRequests.reduce((sum, r) => sum + (r.days || 0), 0);
    const availableDays = Math.max(0, totalQuota - usedDays);

    if (requestingDays > availableDays) {
        return {
            valid: false,
            message: `Insufficient leave balance! You have ${availableDays} day(s) available for ${leaveTypeObj.name}, but requested ${requestingDays} day(s).`,
            availableDays,
            totalQuota,
            usedDays
        };
    }

    return { valid: true, availableDays, totalQuota, usedDays, leaveTypeName: leaveTypeObj.name };
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

        // Validate leave balance before creation
        const balanceCheck = await checkAvailableLeaveBalance(employee._id, leaveType, Number(days));
        if (!balanceCheck.valid) {
            return res.status(400).json({ message: balanceCheck.message });
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

        const currentRequest = await LeaveRequest.findById(id).populate('leaveType');
        if (!currentRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        // If status is changing to Approved, check remaining balance
        if (status === 'Approved' && currentRequest.status !== 'Approved') {
            const balanceCheck = await checkAvailableLeaveBalance(
                currentRequest.employee,
                currentRequest.leaveType._id,
                currentRequest.days,
                id
            );

            if (!balanceCheck.valid) {
                return res.status(400).json({ message: balanceCheck.message });
            }
        }

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
            .populate('employee', 'name employeeId email profileImage user primaryCentre')
            .populate('leaveType', 'name days')
            .populate('reviewedBy', 'name email');

        // Sync attendance records on approval or approval removal
        if (status === 'Approved') {
            const start = new Date(leaveRequest.startDate);
            const end = new Date(leaveRequest.endDate);
            const daysInterval = eachDayOfInterval({ start, end });
            const employeeUser = leaveRequest.employee?.user;
            const centreId = leaveRequest.employee?.primaryCentre;

            if (employeeUser) {
                for (const d of daysInterval) {
                    const dayStart = startOfDay(d);
                    let att = await EmployeeAttendance.findOne({
                        user: employeeUser,
                        date: dayStart
                    });

                    if (!att) {
                        att = new EmployeeAttendance({
                            user: employeeUser,
                            employeeId: leaveRequest.employee._id,
                            centreId: centreId || null,
                            date: dayStart,
                            status: 'Leave',
                            remarks: `Approved Leave (${leaveRequest.leaveType?.name || 'Leave'})`
                        });
                    } else {
                        if (!att.checkIn?.time) {
                            att.status = 'Leave';
                            att.remarks = `Approved Leave (${leaveRequest.leaveType?.name || 'Leave'})`;
                        }
                    }
                    await att.save();
                }
            }
        } else if (currentRequest.status === 'Approved' && status !== 'Approved') {
            // Reverting approval -> remove auto-generated Leave attendance records
            const start = new Date(currentRequest.startDate);
            const end = new Date(currentRequest.endDate);
            const daysInterval = eachDayOfInterval({ start, end });
            const employeeUser = leaveRequest.employee?.user;

            if (employeeUser) {
                for (const d of daysInterval) {
                    const dayStart = startOfDay(d);
                    const att = await EmployeeAttendance.findOne({
                        user: employeeUser,
                        date: dayStart,
                        status: 'Leave'
                    });

                    if (att && (!att.checkIn || !att.checkIn.time)) {
                        await EmployeeAttendance.findByIdAndDelete(att._id);
                    }
                }
            }
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

        const leaveRequest = await LeaveRequest.findById(id);
        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        // If deleting an approved leave request, cleanup attendance records
        if (leaveRequest.status === 'Approved') {
            const employee = await Employee.findById(leaveRequest.employee);
            if (employee && employee.user) {
                const start = new Date(leaveRequest.startDate);
                const end = new Date(leaveRequest.endDate);
                const daysInterval = eachDayOfInterval({ start, end });

                for (const d of daysInterval) {
                    const dayStart = startOfDay(d);
                    const att = await EmployeeAttendance.findOne({
                        user: employee.user,
                        date: dayStart,
                        status: 'Leave'
                    });

                    if (att && (!att.checkIn || !att.checkIn.time)) {
                        await EmployeeAttendance.findByIdAndDelete(att._id);
                    }
                }
            }
        }

        await LeaveRequest.findByIdAndDelete(id);

        res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
        console.error('Error deleting leave request:', error);
        res.status(500).json({ message: 'Error deleting leave request', error: error.message });
    }
};
