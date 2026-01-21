import Student from "../../models/Students.js";

export const updateStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const updateData = req.body;

        // Helper to recursively clean empty strings to null
        const cleanEmptyStrings = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(item => cleanEmptyStrings(item));
            } else if (typeof obj === 'object' && obj !== null) {
                const newObj = {};
                for (const key in obj) {
                    newObj[key] = cleanEmptyStrings(obj[key]);
                }
                return newObj;
            } else if (obj === "") {
                return null;
            }
            return obj;
        };

        const cleanedData = cleanEmptyStrings(updateData);

        const student = await Student.findByIdAndUpdate(
            studentId,
            { $set: cleanedData },
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
