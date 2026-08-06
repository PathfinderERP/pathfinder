import Course from "../../models/Master_data/Courses.js";

export const getCourses = async (req, res) => {
    try {
        const { mode, courseType, class: classId, examTag, isActive, status } = req.query;
        
        // Build filter object
        const filter = {};
        if (mode) filter.mode = mode;
        if (courseType) filter.courseType = courseType;
        if (classId) filter.class = classId;
        if (examTag) filter.examTag = examTag;
        if (isActive !== undefined) {
            if (isActive === "true") {
                filter.isActive = { $ne: false };
            } else if (isActive === "false") {
                filter.isActive = false;
            }
        } else if (status) {
            if (status.toLowerCase() === "active") {
                filter.isActive = { $ne: false };
            } else if (status.toLowerCase() === "inactive" || status.toLowerCase() === "deactive") {
                filter.isActive = false;
            }
        }
        
        const courses = await Course.find(filter)
            .populate("examTag", "name")
            .populate("class", "name")
            .populate("department", "departmentName showInAdmission")
            .populate("createdBy", "name");
            
        res.status(200).json(courses);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
