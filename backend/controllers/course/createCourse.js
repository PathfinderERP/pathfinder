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
            programme,
        } = req.body;

        // Validate required fields
        if (!courseName || !examTag || !courseDuration || !coursePeriod || !department || !courseSession || !feesStructure || !mode) {
            return res.status(400).json({ message: "Required fields are missing. Please ensure Course Name, Exam Tag, Duration, Period, Department, Session, Fees, and Mode are provided." });
        }

        // Clean up optional fields that might be empty strings from the frontend
        const cleanedData = {
            courseName,
            examTag,
            courseDuration,
            coursePeriod,
            department,
            courseSession,
            feesStructure,
            mode,
            class: classId && classId !== "" ? classId : undefined,
            courseType: courseType && courseType !== "" ? courseType : undefined,
            programme: programme && programme !== "" ? programme : undefined,
        };

        // Create new course
        const newCourse = new Course(cleanedData);

        await newCourse.save();

        res.status(201).json({
            message: "Course created successfully",
            course: newCourse,
        });

    } catch (err) {
        console.error("Course creation error:", err);

        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: "Validation Error: " + messages.join(', ') });
        }

        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            return res.status(400).json({ message: "A course with this name already exists." });
        }

        // Handle casting errors (e.g. invalid ObjectIds)
        if (err.name === 'CastError') {
            return res.status(400).json({ message: `Invalid data provided for field: ${err.path}` });
        }

        res.status(500).json({ message: "Server error during course creation", error: err.message });
    }
};
