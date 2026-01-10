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
            batchId,
            batchIds,
            coordinatorId
        } = req.body;

        // Center authorization check
        if (req.user.role !== 'superAdmin') {
            const userCentres = req.user.centres || [];
            if (!userCentres.map(c => c.toString()).includes(centreId?.toString())) {
                return res.status(403).json({ message: "You are not authorized to create classes for this center" });
            }
        }

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
            batchIds: batchIds || [batchId], // Fallback if old frontend still sends batchId
            coordinatorId
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
            coordinatorId,
            fromDate,
            toDate,
            search,
            status,
            page = 1,
            limit = 10
        } = req.query;

        // Build Query
        const query = {};

        // Role-based filtering
        const userId = req.user._id;

        if (req.user && req.user.role === 'Class_Coordinator') {
            query.coordinatorId = userId;
        } else if (req.user && req.user.role === 'teacher') {
            query.teacherId = userId;
        } else if (req.user && req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
            // Other non-admin roles (HOD, RM, etc.) - for now restrict to their own ID if they have a field
            // but usually they see by centre. Let's keep it restricted to teacherId if they are viewed as such.
            query.teacherId = userId;
        } else {
            // Admins
            if (teacherId) query.teacherId = teacherId;
            if (coordinatorId) query.coordinatorId = coordinatorId;
        }

        // Center-based filtering for Non-SuperAdmins
        if (req.user && req.user.role !== 'superAdmin') {
            const userCentres = req.user.centres || [];

            // For teachers and coordinators, we already filtered by their ID.
            // Only apply centre filter to Admins or if they have centres but no ID field matched (though role check handles it)
            if (req.user.role === 'admin') {
                if (userCentres.length > 0) {
                    if (centreId) {
                        if (!userCentres.map(c => c.toString()).includes(centreId.toString())) {
                            query.centreId = { $in: userCentres };
                        } else {
                            query.centreId = centreId;
                        }
                    } else {
                        query.centreId = { $in: userCentres };
                    }
                } else {
                    // Admins with no centers assigned see nothing
                    return res.status(200).json({ classes: [], total: 0, currentPage: parseInt(page), totalPages: 0 });
                }
            } else {
                // For other roles (teachers, coordinators), they only see their assigned data.
                // Optionally allow them to filter by centre if they HAVE centres assigned.
                if (centreId) {
                    query.centreId = centreId;
                } else if (userCentres.length > 0 && (req.user.role !== 'teacher' && req.user.role !== 'Class_Coordinator')) {
                    // Restrict by centre for roles that are not teacher/coordinator (like RM/HOD if they don't have ID assignments)
                    query.centreId = { $in: userCentres };
                }
            }
        } else if (centreId) {
            query.centreId = centreId;
        }
        if (batchId) query.batchIds = batchId; // Search in array
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

        if (req.query.hasFeedback === 'true') {
            query.teacherFeedback = { $exists: true, $not: { $size: 0 } };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const classes = await ClassSchedule.find(query)
            .populate("subjectId", "subjectName topicName")
            .populate("teacherId", "name userType")
            .populate("examId", "name tagName")
            .populate("courseId", "courseName name")
            .populate("centreId", "centreName centerName name latitude longitude")
            .populate("coordinatorId", "name")
            .populate("batchIds", "batchName name")
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

        // Permission Check
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'Class_Coordinator') {
            return res.status(403).json({ message: "Access denied" });
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

        // Permission Check
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'Class_Coordinator') {
            return res.status(403).json({ message: "Access denied" });
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

// Update a class schedule
export const updateClassSchedule = async (req, res) => {
    try {
        const { id } = req.params;
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
            batchIds,
            coordinatorId
        } = req.body;

        const currentClass = await ClassSchedule.findById(id);
        if (!currentClass) {
            return res.status(404).json({ message: "Class schedule not found" });
        }

        // Permission Check
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'Class_Coordinator') {
            return res.status(403).json({ message: "Access denied" });
        }

        // Center authorization check
        if (req.user.role !== 'superAdmin') {
            const userCentres = req.user.centres || [];
            if (centreId && !userCentres.map(c => c.toString()).includes(centreId?.toString())) {
                return res.status(403).json({ message: "You are not authorized to update classes for this center" });
            }
        }

        const updatedClass = await ClassSchedule.findByIdAndUpdate(
            id,
            {
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
                batchIds,
                coordinatorId
            },
            { new: true }
        );

        res.status(200).json({ message: "Class schedule updated successfully", class: updatedClass });
    } catch (error) {
        console.error("Error updating class schedule:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a class schedule
export const deleteClassSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        // Permission Check
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'Class_Coordinator') {
            return res.status(403).json({ message: "Access denied" });
        }

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
        const { teacherFeedback } = req.body;

        const currentClass = await ClassSchedule.findById(id);
        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        currentClass.teacherFeedback = teacherFeedback || [];
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
        const { latitude, longitude } = req.body;
        const currentClass = await ClassSchedule.findById(id);

        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Only allow teachers or admins
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'teacher') {
            return res.status(403).json({ message: "Access denied" });
        }

        currentClass.teacherAttendance = true;
        currentClass.attendanceLatitude = latitude;
        currentClass.attendanceLongitude = longitude;
        await currentClass.save();

        res.status(200).json({ message: "Attendance marked successfully", class: currentClass });
    } catch (error) {
        console.error("Error marking teacher attendance:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



// Start study (Teacher side)
export const startStudy = async (req, res) => {
    try {
        const { id } = req.params;
        const currentClass = await ClassSchedule.findById(id);

        if (!currentClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Only allow teachers or admins
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'teacher') {
            return res.status(403).json({ message: "Access denied" });
        }

        currentClass.studyStartTime = new Date();
        await currentClass.save();

        res.status(200).json({ message: "Study started successfully", class: currentClass });
    } catch (error) {
        console.error("Error starting study:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get required data for dropdowns (Helper endpoint)
export const getClassDropdownData = async (req, res) => {
    try {
        const subjects = await AcademicsSubject.find();
        // user role teacher
        const teachers = await User.find({ role: "teacher" });
        const coordinators = await User.find({ role: "Class_Coordinator" });
        const courses = await Course.find();
        let centres, batches;
        if (req.user && req.user.role !== 'superAdmin') {
            const userCentres = req.user.centres || [];
            centres = await Centre.find({ _id: { $in: userCentres } });
            // Fetch batches for these centres
            batches = await Batch.find({ centreId: { $in: userCentres } });
            
            // Fallback: If no batches found for assigned centres, return all batches
            // (This handles the case where batches are not yet linked to centres in the DB)
            if (!batches || batches.length === 0) {
                batches = await Batch.find();
            }
        } else {
            centres = await Centre.find();
            batches = await Batch.find();
        }
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
            academicClasses,
            coordinators
        });
    } catch (error) {
        console.error("Error fetching dropdown data:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
