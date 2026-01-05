import ExpenditureType from "../../models/Master_data/ExpenditureType.js";

export const createExpenditureType = async (req, res) => {
    try {
        const { name, description } = req.body;
        const type = new ExpenditureType({ name, description });
        await type.save();
        res.status(201).json({ message: "Expenditure Type created", data: type });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getExpenditureTypes = async (req, res) => {
    try {
        const types = await ExpenditureType.find().sort({ name: 1 });
        res.status(200).json(types);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateExpenditureType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const type = await ExpenditureType.findByIdAndUpdate(id, { name, description }, { new: true });
        res.status(200).json({ message: "Expenditure Type updated", data: type });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteExpenditureType = async (req, res) => {
    try {
        const { id } = req.params;
        await ExpenditureType.findByIdAndDelete(id);
        res.status(200).json({ message: "Expenditure Type deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
