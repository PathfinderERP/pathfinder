import Student from "../../models/Students.js";

export const deleteStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findByIdAndDelete(studentId);

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
