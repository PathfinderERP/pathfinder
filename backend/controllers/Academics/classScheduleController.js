import ClassSchedule from "../../models/Academics/ClassSchedule.js";
import AcademicsSubject from "../../models/Academics/Academics_subject.js";
import User from "../../models/User.js";
import Course from "../../models/Master_data/Courses.js";
import Centre from "../../models/Master_data/Centre.js";
import Batch from "../../models/Master_data/Batch.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import AcademicsClass from "../../models/Academics/Academics_class.js";

// Create a new class schedule
export const createClassSchedule = async (req, res) => {
    try {
        const {
            className,
            date,
            classMode,
            startTime,
            endTime,
            subjectId,
            teacherId,
            session,
            examId,
            courseId,
            centreId,
            batchId
        } = req.body;

        const newClass = new ClassSchedule({
            className,
            date,
            classMode,
            startTime,
            endTime,
            subjectId,
            teacherId,
            session,
            examId,
            courseId,
            centreId,
            batchId
        });

        await newClass.save();
        res.status(201).json({ message: "Class scheduled successfully", class: newClass });
    } catch (error) {
        console.error("Error creating class schedule:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all class schedules with Filtering and Pagination
export const getClassSchedules = async (req, res) => {
    try {
        const {
            centreId,
            batchId,
            subjectId,
            teacherId,
            fromDate,
            toDate,
            search,
            page = 1,
            limit = 10
        } = req.query;

        // Build Query
        const query = {};

        if (centreId) query.centreId = centreId;
        if (batchId) query.batchId = batchId;
        if (subjectId) query.subjectId = subjectId;
        if (teacherId) query.teacherId = teacherId;

        if (fromDate || toDate) {
            query.date = {};
            if (fromDate) query.date.$gte = new Date(fromDate);
            if (toDate) query.date.$lte = new Date(toDate);
        }

        if (search) {
            query.className = { $regex: search, $options: "i" };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const classes = await ClassSchedule.find(query)
            .populate("subjectId", "subjectName topicName") // Validating field names
            .populate("teacherId", "name userType")
            .populate("examId", "name tagName")
            .populate("courseId", "courseName name")
            .populate("centreId", "centreName centerName name")
            .populate("batchId", "batchName name")
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ClassSchedule.countDocuments(query);

        res.status(200).json({
            classes,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error("Error fetching class schedules:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get required data for dropdowns (Helper endpoint)
export const getClassDropdownData = async (req, res) => {
    try {
        const subjects = await AcademicsSubject.find();
        // user role teacher
        const teachers = await User.find({ role: "teacher" });
        const courses = await Course.find();
        const centres = await Centre.find();
        const batches = await Batch.find();
        const exams = await ExamTag.find();
        const academicClasses = await AcademicsClass.find();

        // Mock sessions if no model exists (or fetch from somewhere if exists)
        // For now, returning a list of years/sessions
        const sessions = ["2023-24", "2024-25", "2025-26"];

        res.status(200).json({
            subjects,
            teachers,
            courses,
            centres,
            batches,
            exams,
            sessions,
            academicClasses
        });
    } catch (error) {
        console.error("Error fetching dropdown data:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
