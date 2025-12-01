import Course from "../../models/Master_data/Courses.js";

export const createCourse = async (req, res) => {
    try {
        const {
            courseName,
            examTag,
            courseDuration,
            coursePeriod,
            class: classId,
            department,
            courseSession,
            feesStructure,
            mode,
            courseType,
        } = req.body;

        // Validate fields
        if (!courseName || !examTag || !courseDuration || !coursePeriod || !department || !courseSession || !feesStructure || !mode || !courseType) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        // Create new course
        const newCourse = new Course({
            courseName,
            examTag,
            courseDuration,
            coursePeriod,
            class: classId,
            department,
            courseSession,
            feesStructure,
            mode,
            courseType,
        });

        await newCourse.save();

        res.status(201).json({
            message: "Course created successfully",
            course: newCourse,
        });

    } catch (err) {
        console.error("Course creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
