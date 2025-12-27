import LeaveType from '../../models/Attendance/LeaveType.js';

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
        res.status(200).json(leaveTypes);
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
