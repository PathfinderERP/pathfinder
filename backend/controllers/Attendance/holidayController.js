import Holiday from '../../models/Attendance/Holiday.js';

export const createHoliday = async (req, res) => {
    try {
        const holiday = new Holiday({
            ...req.body,
            createdBy: req.user.id
        });
        await holiday.save();
        res.status(201).json(holiday);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getHolidays = async (req, res) => {
    try {
        const { year, month } = req.query;
        let query = {};
        if (year) {
            const start = new Date(year, 0, 1);
            const end = new Date(year, 11, 31);
            query.date = { $gte: start, $lte: end };
        }
        const holidays = await Holiday.find(query).sort({ date: 1 });
        res.status(200).json(holidays);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
        res.status(200).json(holiday);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);
        if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
        res.status(200).json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
