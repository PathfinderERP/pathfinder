import Course from "../../models/Master_data/Courses.js";

export const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate("examTag", "name")
            .populate("class", "name")
            .populate("department", "departmentName");

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        res.status(200).json(course);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
