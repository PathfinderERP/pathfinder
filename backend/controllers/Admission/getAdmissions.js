import Admission from "../../models/Admission/Admission.js";

export const getAdmissions = async (req, res) => {
    try {
        const admissions = await Admission.find()
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .sort({ createdAt: -1 });

        res.status(200).json(admissions);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
