import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";

/**
 * Permanently delete a deactivated student and ALL of their admission records.
 * Only works if the student is "Deactivated" — an extra guard so active students
 * cannot be accidentally wiped.
 */
export const permanentlyDeleteStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Safety guard: only allow deletion of deactivated students
        if (student.status !== "Deactivated") {
            return res.status(400).json({
                message: "Only deactivated students can be permanently deleted. Please deactivate the student first."
            });
        }

        // Delete all admissions that belong to this student
        const admissionResult = await Admission.deleteMany({ student: studentId });

        // Delete the student record
        await Student.findByIdAndDelete(studentId);

        return res.status(200).json({
            message: "Student and all associated records permanently deleted.",
            deletedAdmissions: admissionResult.deletedCount
        });
    } catch (err) {
        console.error("permanentlyDeleteStudent error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};
