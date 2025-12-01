import Student from "../../models/Students.js";

export const updateStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const updateData = req.body;

        const student = await Student.findByIdAndUpdate(
            studentId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({ 
            message: "Student updated successfully",
            student 
        });
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
