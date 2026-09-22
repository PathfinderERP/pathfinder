import LeaveType from '../../models/Attendance/LeaveType.js';
import LeaveRequest from '../../models/Attendance/LeaveRequest.js';
import Employee from '../../models/HR/Employee.js';
import User from '../../models/User.js';

export const createLeaveType = async (req, res) => {
    try {
        const leaveType = new LeaveType({
            ...req.body,
            createdBy: req.user.id
        });
        await leaveType.save();
        res.status(201).json(leaveType);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaveTypes = async (req, res) => {
    try {
        const leaveTypes = await LeaveType.find().populate('designations', 'name');

        const user = await User.findById(req.user.id).select('role email');
        const isTeacher = user?.role === 'teacher';

        // Check if employeeId is passed in query or find employee by logged-in user
        let targetEmployeeId = req.query.employeeId;
        if (!targetEmployeeId) {
            const emp = await Employee.findOne({ $or: [{ user: req.user.id }, { email: user?.email }] });
            if (emp) {
                targetEmployeeId = emp._id;
            }
        }

        // Get all active (Approved and Pending) leave requests for target employee
        let activeRequests = [];
        if (targetEmployeeId) {
            activeRequests = await LeaveRequest.find({
                employee: targetEmployeeId,
                status: { $in: ['Approved', 'Pending'] }
            });
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyEndYear = fyStartYear + 1;
        const fyStartDate = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0, 0));
        const fyEndDate = new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59, 999));

        const adjustedLeaveTypes = leaveTypes.map(lt => {
            const obj = lt.toObject();
            const totalQuota = (isTeacher && obj.teacherDays != null) ? obj.teacherDays : obj.days;
            obj.days = totalQuota;
            obj.totalDays = totalQuota;

            const isMonthly = /short\s*leave|early\s*leave/i.test(obj.name);
            obj.isMonthly = isMonthly;

            if (targetEmployeeId) {
                const relevant = activeRequests
                    .filter(r => r.leaveType?.toString() === obj._id.toString())
                    .filter(r => {
                        const rDate = new Date(r.startDate);
                        if (isMonthly) {
                            return rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
                        }
                        return rDate >= fyStartDate && rDate <= fyEndDate;
                    });

                const approved = relevant.filter(r => r.status === 'Approved').reduce((sum, r) => sum + (r.days || 0), 0);
                const pending = relevant.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (r.days || 0), 0);
                const deducted = approved + pending;

                obj.approvedDays = approved;
                obj.pendingDays = pending;
                obj.usedDays = deducted;
                obj.availableDays = Math.max(0, totalQuota - deducted);
            } else {
                obj.approvedDays = 0;
                obj.pendingDays = 0;
                obj.usedDays = 0;
                obj.availableDays = totalQuota;
            }
            return obj;
        });

        res.status(200).json(adjustedLeaveTypes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!leaveType) return res.status(404).json({ message: 'Leave type not found' });
        res.status(200).json(leaveType);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.findByIdAndDelete(req.params.id);
        if (!leaveType) return res.status(404).json({ message: 'Leave type not found' });
        res.status(200).json({ message: 'Leave type deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
