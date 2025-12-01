import ExamTag from "../../models/Master_data/ExamTag.js";

export const deleteExamTag = async (req, res) => {
    try {
        const deleted = await ExamTag.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Exam Tag not found" });

        res.status(200).json({ message: "Exam Tag deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
