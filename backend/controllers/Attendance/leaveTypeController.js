import LeaveType from '../../models/Attendance/LeaveType.js';
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

        // Determine the requesting user's role to return role-specific entitlements
        const user = await User.findById(req.user.id).select('role');
        const isTeacher = user?.role === 'teacher';

        // For each leave type, override `days` with the teacher-specific value if applicable
        const adjustedLeaveTypes = leaveTypes.map(lt => {
            const obj = lt.toObject();
            if (isTeacher && obj.teacherDays != null) {
                obj.days = obj.teacherDays;
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
