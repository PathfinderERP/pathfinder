import ExamTag from "../../models/Master_data/ExamTag.js";

export const updateExamTag = async (req, res) => {
    try {
        const updated = await ExamTag.findByIdAndUpdate(
            req.params.id,
            { name: req.body.name },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Exam Tag not found" });

        res.status(200).json({ message: "Updated", updated });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
