import Admission from "../../models/Admission/Admission.js";

export const updateAdmission = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const admission = await Admission.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        )
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name');

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.student && admission.student.status === 'Deactivated') {
            return res.status(400).json({ message: "This student is deactivated. Updates are restricted." });
        }

        res.status(200).json({
            message: "Admission updated successfully",
            admission
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
