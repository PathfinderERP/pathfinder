import Course from "../../models/Master_data/Courses.js";

export const updateCourse = async (req, res) => {
    try {
        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            req.body,
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
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
