import Student from "../../models/Students.js";

export const updateStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const updateData = req.body;

        // Clean up empty strings for ObjectId fields to avoid CastError
        if (updateData.course === "") updateData.course = null;
        if (updateData.department === "") updateData.department = null;
        if (Array.isArray(updateData.batches)) {
            updateData.batches = updateData.batches.filter(id => id !== "");
        }

        const student = await Student.findByIdAndUpdate(
            studentId,
            { $set: updateData },
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

        // Handle specific Mongoose validation or cast errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", error: error.message });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format", error: error.message });
        }

        res.status(500).json({ message: "Server error", error: error.message });
    }
};
