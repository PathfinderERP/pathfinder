import ActivityPurpose from "../../models/Master_data/ActivityPurpose.js";

export const createActivityPurpose = async (req, res) => {
    try {
        const { name } = req.body;
        const purpose = new ActivityPurpose({ name });
        await purpose.save();
        res.status(201).json({ message: "Activity purpose created", data: purpose });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getActivityPurposes = async (req, res) => {
    try {
        const purposes = await ActivityPurpose.find().sort({ name: 1 });
        res.status(200).json(purposes);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateActivityPurpose = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const purpose = await ActivityPurpose.findByIdAndUpdate(id, { name }, { new: true });
        res.status(200).json({ message: "Activity purpose updated", data: purpose });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteActivityPurpose = async (req, res) => {
    try {
        const { id } = req.params;
        await ActivityPurpose.findByIdAndDelete(id);
        res.status(200).json({ message: "Activity purpose deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
