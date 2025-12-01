import ExamTag from "../../models/Master_data/ExamTag.js";

export const createExamTag = async (req, res) => {
    try {
        const { name } = req.body;

        const examTag = new ExamTag({ name });
        await examTag.save();

        res.status(201).json({ message: "Exam Tag created", data: examTag });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
