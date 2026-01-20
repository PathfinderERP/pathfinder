import Course from "../../models/Master_data/Courses.js";

export const updateCourse = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Clean up optional fields that might be empty strings from the frontend
        const optionalFields = ['class', 'courseType', 'programme'];
        optionalFields.forEach(field => {
            if (updateData[field] === "") {
                updateData[field] = null; // or undefined to remove it
            }
        });

        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedCourse) {
            return res.status(404).json({ message: "Course not found" });
        }

        res.status(200).json({
            message: "Course updated successfully",
            course: updatedCourse
        });
    } catch (err) {
        console.error("Course update error:", err);

        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: "Validation Error: " + messages.join(', ') });
        }

        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            return res.status(400).json({ message: "A course with this name already exists." });
        }

        // Handle casting errors
        if (err.name === 'CastError') {
            return res.status(400).json({ message: `Invalid data provided for field: ${err.path}` });
        }

        res.status(500).json({ message: "Server error during course update", error: err.message });
    }
};
