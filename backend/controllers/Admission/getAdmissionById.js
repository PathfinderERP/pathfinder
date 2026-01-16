import Admission from "../../models/Admission/Admission.js";

export const getAdmissionById = async (req, res) => {
    try {
        const { id } = req.params;

        const admission = await Admission.findById(id)
            .populate('student')
            .populate('course')
            .populate({
                path: 'board',
                populate: {
                    path: 'subjects.subjectId'
                }
            })
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name');

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        res.status(200).json(admission);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
