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

        // Get all approved leave requests for target employee
        let approvedRequests = [];
        if (targetEmployeeId) {
            approvedRequests = await LeaveRequest.find({
                employee: targetEmployeeId,
                status: 'Approved'
            });
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const adjustedLeaveTypes = leaveTypes.map(lt => {
            const obj = lt.toObject();
            const totalQuota = (isTeacher && obj.teacherDays != null) ? obj.teacherDays : obj.days;
            obj.days = totalQuota;
            obj.totalDays = totalQuota;

            const isMonthly = /short\s*leave|early\s*leave/i.test(obj.name);
            obj.isMonthly = isMonthly;

            if (targetEmployeeId) {
                const used = approvedRequests
                    .filter(r => r.leaveType.toString() === obj._id.toString())
                    .filter(r => {
                        if (!isMonthly) return true;
                        const rDate = new Date(r.startDate);
                        return rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, r) => sum + (r.days || 0), 0);
                obj.usedDays = used;
                obj.availableDays = Math.max(0, totalQuota - used);
            } else {
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
