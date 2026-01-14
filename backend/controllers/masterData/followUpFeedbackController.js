import FollowUpFeedback from "../../models/Master_data/FollowUpFeedback.js";

export const createFollowUpFeedback = async (req, res) => {
    try {
        const { name } = req.body;
        const feedback = new FollowUpFeedback({ name });
        await feedback.save();
        res.status(201).json({ message: "Follow-up Feedback created successfully", data: feedback });
    } catch (error) {
        res.status(500).json({ message: "Failed to create feedback", error: error.message });
    }
};

export const getFollowUpFeedbacks = async (req, res) => {
    try {
        const feedbacks = await FollowUpFeedback.find().sort({ name: 1 });
        res.status(200).json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch feedbacks", error: error.message });
    }
};

export const updateFollowUpFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const feedback = await FollowUpFeedback.findByIdAndUpdate(id, { name }, { new: true });
        if (!feedback) return res.status(404).json({ message: "Feedback not found" });
        res.status(200).json({ message: "Feedback updated successfully", data: feedback });
    } catch (error) {
        res.status(500).json({ message: "Failed to update feedback", error: error.message });
    }
};

export const deleteFollowUpFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await FollowUpFeedback.findByIdAndDelete(id);
        if (!feedback) return res.status(404).json({ message: "Feedback not found" });
        res.status(200).json({ message: "Feedback deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete feedback", error: error.message });
    }
};
