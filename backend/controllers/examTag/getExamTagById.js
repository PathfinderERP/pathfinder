import ExamTag from "../../models/Master_data/ExamTag.js";

export const getExamTagById = async (req, res) => {
    try {
        const tag = await ExamTag.findById(req.params.id);
        if (!tag) return res.status(404).json({ message: "Exam Tag not found" });

        res.status(200).json(tag);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
