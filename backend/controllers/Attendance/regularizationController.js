import Regularization from '../../models/Attendance/Regularization.js';

export const createRegularization = async (req, res) => {
    try {
        const regularization = new Regularization({
            ...req.body,
            employeeId: req.body.employeeId || req.user.id
        });
        await regularization.save();
        res.status(201).json(regularization);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRegularizations = async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        let query = {};
        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;

        const regularizations = await Regularization.find(query)
            .populate('employeeId', 'name employeeId')
            .sort({ createdAt: -1 });

        res.status(200).json(regularizations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateRegularizationStatus = async (req, res) => {
    try {
        const { status, reviewRemark } = req.body;
        const regularization = await Regularization.findByIdAndUpdate(
            req.params.id,
            { status, reviewRemark, reviewedBy: req.user.id },
            { new: true }
        );
        if (!regularization) return res.status(404).json({ message: 'Regularization not found' });
        res.status(200).json(regularization);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteRegularization = async (req, res) => {
    try {
        const regularization = await Regularization.findByIdAndDelete(req.params.id);
        if (!regularization) return res.status(404).json({ message: 'Regularization not found' });
        res.status(200).json({ message: 'Regularization deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
