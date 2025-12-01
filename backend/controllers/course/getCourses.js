import Course from "../../models/Master_data/Courses.js";

export const getCourses = async (req, res) => {
    try {
        const { mode, courseType, class: classId, examTag } = req.query;
        
        // Build filter object
        const filter = {};
        if (mode) filter.mode = mode;
        if (courseType) filter.courseType = courseType;
        if (classId) filter.class = classId;
        if (examTag) filter.examTag = examTag;
        
        const courses = await Course.find(filter)
            .populate("examTag", "name")
            .populate("class", "name")
            .populate("department", "departmentName");
            
        res.status(200).json(courses);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
