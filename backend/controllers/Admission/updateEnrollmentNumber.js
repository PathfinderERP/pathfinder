import Admission from "../../models/Admission/Admission.js";

export const updateEnrollmentNumber = async (req, res) => {
    try {
        const { id } = req.params;
        const { admissionNumber } = req.body;

        if (!admissionNumber || typeof admissionNumber !== "string" || !admissionNumber.trim()) {
            return res.status(400).json({ message: "A valid enrollment number is required." });
        }

        const trimmedNumber = admissionNumber.trim().toUpperCase();

        // First, get the current admission to find the student ID
        const currentAdmission = await Admission.findById(id);
        if (!currentAdmission) {
            return res.status(404).json({ message: "Admission not found." });
        }

        const studentId = currentAdmission.student;

        // Check for duplicates among OTHER students
        const existingForOtherStudent = await Admission.findOne({
            admissionNumber: trimmedNumber,
            student: { $ne: studentId }
        });

        if (existingForOtherStudent) {
            return res.status(409).json({
                message: `The enrollment number "${trimmedNumber}" is already assigned to another student. Each student must have a unique identifier.`
            });
        }

        // Update ALL admissions for this student
        await Admission.updateMany(
            { student: studentId },
            { admissionNumber: trimmedNumber }
        );

        // Fetch the updated current admission to return
        const admission = await Admission.findById(id)
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
