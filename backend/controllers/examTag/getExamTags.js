import ExamTag from "../../models/Master_data/ExamTag.js";

export const getExamTags = async (req, res) => {
    try {
        const tags = await ExamTag.find();
        res.status(200).json(tags);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
