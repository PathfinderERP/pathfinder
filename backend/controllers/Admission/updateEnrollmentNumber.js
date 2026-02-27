import Admission from "../../models/Admission/Admission.js";

export const updateEnrollmentNumber = async (req, res) => {
    try {
        const { id } = req.params;
        const { admissionNumber } = req.body;

        if (!admissionNumber || typeof admissionNumber !== "string" || !admissionNumber.trim()) {
            return res.status(400).json({ message: "A valid enrollment number is required." });
        }

        const trimmedNumber = admissionNumber.trim().toUpperCase();

        // Check for duplicates (allow updating to the same value it already has)
        const existing = await Admission.findOne({
            admissionNumber: trimmedNumber,
            _id: { $ne: id }
        });

        if (existing) {
            return res.status(409).json({
                message: `Enrollment number "${trimmedNumber}" is already assigned to another admission.`
            });
        }

        const admission = await Admission.findByIdAndUpdate(
            id,
            { admissionNumber: trimmedNumber },
            { new: true, runValidators: false }
        )
            .populate("student")
            .populate("course")
            .populate("class")
            .populate("examTag")
            .populate("department")
            .populate("createdBy", "name");

        if (!admission) {
            return res.status(404).json({ message: "Admission not found." });
        }

        return res.status(200).json({
            message: "Enrollment number updated successfully.",
            admission
        });
    } catch (err) {
        console.error("updateEnrollmentNumber error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};
