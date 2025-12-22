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
            status,
            page = 1,
            limit = 10
        } = req.query;

        // Build Query
        const query = {};

        // If not superAdmin or admin, restrict to self
        if (req.user && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
            query.teacherId = req.user.id;
        } else if (teacherId) {
            query.teacherId = teacherId;
        }

        if (centreId) query.centreId = centreId;
        if (batchId) query.batchId = batchId;
        if (subjectId) query.subjectId = subjectId;
        if (status) query.status = status;

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
            .populate("subjectId", "subjectName topicName")
            .populate("teacherId", "name userType")
            .populate("examId", "name tagName")
            .populate("courseId", "courseName name")
            .populate("centreId", "centreName centerName name latitude longitude")
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

// Start a class
export const startClass = async (req, res) => {
    try {
        const { id } = req.params;
        const currentClass = await ClassSchedule.findById(id);

        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        currentClass.status = "Ongoing";
        currentClass.actualStartTime = new Date();
        await currentClass.save();

        res.status(200).json({ message: "Class started successfully", class: currentClass });
    } catch (error) {
        console.error("Error starting class:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// End a class
export const endClass = async (req, res) => {
    try {
        const { id } = req.params;
        const currentClass = await ClassSchedule.findById(id);

        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        currentClass.status = "Completed";
        currentClass.actualEndTime = new Date();
        await currentClass.save();

        res.status(200).json({ message: "Class ended successfully", class: currentClass });
    } catch (error) {
        console.error("Error ending class:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a class schedule
export const deleteClassSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedClass = await ClassSchedule.findByIdAndDelete(id);

        if (!deletedClass) {
            return res.status(404).json({ message: "Class schedule not found" });
        }

        res.status(200).json({ message: "Class schedule deleted successfully" });
    } catch (error) {
        console.error("Error deleting class schedule:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Submit feedback for a class
export const submitFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedbackName, feedbackContent } = req.body;

        const currentClass = await ClassSchedule.findById(id);
        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        currentClass.feedbackName = feedbackName;
        currentClass.feedbackContent = feedbackContent;
        await currentClass.save();

        res.status(200).json({ message: "Feedback submitted successfully", class: currentClass });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Mark teacher attendance
export const markTeacherAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const currentClass = await ClassSchedule.findById(id);

        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Only allow teachers to mark their own attendance
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
            if (currentClass.teacherId.toString() !== req.user.id) {
                return res.status(403).json({ message: "You can only mark attendance for your own classes" });
            }
        }

        console.log("Reviewing Attendance Request. Body:", req.body);
        const { latitude, longitude } = req.body || {};
        currentClass.teacherAttendance = true;

        if (latitude) currentClass.attendanceLatitude = latitude;
        if (longitude) currentClass.attendanceLongitude = longitude;
        await currentClass.save();

        res.status(200).json({ message: "Attendance marked successfully", class: currentClass });
    } catch (error) {
        console.error("Error marking attendance:", error);
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
