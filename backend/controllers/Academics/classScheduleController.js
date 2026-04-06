import ClassSchedule from "../../models/Academics/ClassSchedule.js";
import AcademicsSubject from "../../models/Academics/Academics_subject.js";
import User from "../../models/User.js";
import Course from "../../models/Master_data/Courses.js";
import Centre from "../../models/Master_data/Centre.js";
import Batch from "../../models/Master_data/Batch.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import AcademicsClass from "../../models/Academics/Academics_class.js";
import Session from "../../models/Master_data/Session.js";
import xlsx from "xlsx";
import fs from "fs";

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
            coordinatorId,
            acadClassId,
            acadSubjectId,
            chapterName,
            topicName,
            message,
            classHours
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
            coordinatorId: coordinatorId || undefined,
            acadClassId: acadClassId || undefined,
            acadSubjectId: acadSubjectId || undefined,
            chapterName,
            topicName,
            message,
            classHours
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
        const userRole = req.user.role;

        if (userRole === 'superAdmin' || userRole === 'admin') {
            // Admins can filter by specific teacher/coordinator if provided
            if (teacherId) {
                const teacherIds = teacherId.split(',').filter(id => id.trim());
                if (teacherIds.length > 0) query.teacherId = { $in: teacherIds };
            }
            if (coordinatorId) {
                const coordinatorIds = coordinatorId.split(',').filter(id => id.trim());
                if (coordinatorIds.length > 0) query.coordinatorId = { $in: coordinatorIds };
            }
        } else if (userRole === 'teacher') {
            // Teachers ONLY see their own classes
            query.teacherId = userId;
        } else if (userRole === 'Class_Coordinator') {
            // Coordinators ONLY see their own classes
            query.coordinatorId = userId;
        } else {
            // Other roles: respect filters if provided, but scope limited by centres below
            if (teacherId) {
                const teacherIds = teacherId.split(',').filter(id => id.trim());
                if (teacherIds.length > 0) query.teacherId = { $in: teacherIds };
            }
            if (coordinatorId) {
                const coordinatorIds = coordinatorId.split(',').filter(id => id.trim());
                if (coordinatorIds.length > 0) query.coordinatorId = { $in: coordinatorIds };
            }
        }

        // Center-based filtering for Non-SuperAdmins
        if (req.user && req.user.role !== 'superAdmin') {
            const userCentres = req.user.centres || [];

            // For teachers and coordinators, we already filtered by their ID.
            // Only apply centre filter to Admins or if they have centres but no ID field matched (though role check handles it)
            if (req.user.role === 'admin') {
                if (userCentres.length > 0) {
                    if (centreId) {
                        const selectedCentres = centreId.split(',').filter(id => id.trim());
                        const authorizedCentres = selectedCentres.filter(id => userCentres.map(c => c.toString()).includes(id.toString()));

                        if (authorizedCentres.length > 0) {
                            query.centreId = { $in: authorizedCentres };
                        } else {
                            // If none of the selected centers are authorized, restrict to userCentres
                            query.centreId = { $in: userCentres };
                        }
                    } else {
                        query.centreId = { $in: userCentres };
                    }
                } else {
                    // Admins with no centers assigned see nothing
                    return res.status(200).json({ classes: [], total: 0, currentPage: parseInt(page), totalPages: 0 });
                }
            } else {
                // For other roles (teachers, coordinators, etc.), restrict to their assigned centres.
                // Allow filtering within assigned centres.
                if (centreId) {
                    const selectedCentres = centreId.split(',').filter(id => id.trim());
                    // Ensure requested centres are in user's assigned list
                    const authorized = selectedCentres.filter(id => userCentres.map(c => c.toString()).includes(id.toString()));
                    if (authorized.length > 0) {
                        query.centreId = { $in: authorized };
                    } else {
                        // If none authorized, default to all assigned centres
                        query.centreId = { $in: userCentres };
                    }
                } else {
                    // Default to all assigned centres if no specific filter
                    if (userCentres.length > 0) {
                        query.centreId = { $in: userCentres };
                    } else {
                        // User has no centres assigned -> sees nothing
                        return res.status(200).json({ classes: [], total: 0, currentPage: -1, totalPages: 0 }); // Return empty
                    }
                }
            }
        } else if (centreId) {
            const selectedCentres = centreId.split(',').filter(id => id.trim());
            if (selectedCentres.length > 0) query.centreId = { $in: selectedCentres };
        }

        if (batchId) {
            const batchIds = batchId.split(',').filter(id => id.trim());
            if (batchIds.length > 0) query.batchIds = { $in: batchIds };
        }
        if (subjectId) {
            const subjectIds = subjectId.split(',').filter(id => id.trim());
            if (subjectIds.length > 0) query.subjectId = { $in: subjectIds };
        }
        if (status) query.status = status;

        if (req.query.classMode) {
            const classModes = req.query.classMode.split(',').filter(m => m.trim());
            if (classModes.length > 0) query.classMode = { $in: classModes };
        }

        if (fromDate || toDate) {
            query.date = {};
            if (fromDate) query.date.$gte = new Date(fromDate);
            if (toDate) query.date.$lte = new Date(toDate);
        }

        // startTime filter (exact or prefix match e.g. "10:00")
        if (req.query.startTime) {
            query.startTime = { $regex: `^${req.query.startTime}`, $options: "i" };
        }

        if (search) {
            query.$or = [
                { className: { $regex: search, $options: "i" } },
                { startTime: { $regex: search, $options: "i" } },
                { endTime: { $regex: search, $options: "i" } },
                { classMode: { $regex: search, $options: "i" } },
                { session: { $regex: search, $options: "i" } },
            ];
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
        const allowedRoles = ['admin', 'superAdmin', 'Class_Coordinator', 'centerIncharge', 'zonalManager', 'zonalHead', 'counsellor'];
        if (!allowedRoles.includes(req.user.role)) {
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
        const allowedRoles = ['admin', 'superAdmin', 'Class_Coordinator', 'centerIncharge', 'zonalManager', 'zonalHead', 'counsellor'];
        if (!allowedRoles.includes(req.user.role)) {
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
            coordinatorId,
            acadClassId,
            acadSubjectId,
            chapterName,
            topicName,
            message,
            classHours
        } = req.body;

        const currentClass = await ClassSchedule.findById(id);
        if (!currentClass) {
            return res.status(404).json({ message: "Class schedule not found" });
        }

        // Permission Check
        const allowedRoles = ['admin', 'superAdmin', 'Class_Coordinator', 'centerIncharge', 'zonalManager', 'zonalHead', 'counsellor'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Center authorization check
        if (req.user.role !== 'superAdmin') {
            const userCentres = req.user.centres || [];
            if (centreId && !userCentres.map(c => c.toString()).includes(centreId?.toString())) {
                return res.status(403).json({ message: "You are not authorized to update classes for this center" });
            }
        }

        let resultClass;
        if (currentClass.status === "Completed") {
            // If the class is already completed, create a NEW one instead of updating
            // This allows the user to reuse the "class structure" every day while keeping the completed one in history
            resultClass = new ClassSchedule({
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
                coordinatorId: coordinatorId || undefined,
                acadClassId: acadClassId || undefined,
                acadSubjectId: acadSubjectId || undefined,
                chapterName,
                topicName,
                message,
                classHours,
                status: "Upcoming" // Reset status for the new instance
            });
            await resultClass.save();
            return res.status(201).json({ 
                message: "New class scheduled successfully (Reused template)", 
                class: resultClass,
                isNew: true 
            });
        } else {
            // Normal update for Upcoming/Ongoing classes
            resultClass = await ClassSchedule.findByIdAndUpdate(
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
                    coordinatorId: coordinatorId || undefined,
                    acadClassId: acadClassId || undefined,
                    acadSubjectId: acadSubjectId || undefined,
                    chapterName,
                    topicName,
                    message,
                    classHours
                },
                { new: true }
            );
            return res.status(200).json({ 
                message: "Class schedule updated successfully", 
                class: resultClass,
                isNew: false 
            });
        }
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
        const allowedRoles = ['admin', 'superAdmin', 'Class_Coordinator', 'centerIncharge', 'zonalManager', 'zonalHead', 'counsellor'];
        if (!allowedRoles.includes(req.user.role)) {
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

        // Only allow teachers or admins/coordinators/etc
        const allowedRoles = ['admin', 'superAdmin', 'Class_Coordinator', 'centerIncharge', 'zonalManager', 'zonalHead', 'counsellor', 'teacher'];
        if (!allowedRoles.includes(req.user.role)) {
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

        // Only allow teachers or admins/coordinators/etc
        const allowedRoles = ['admin', 'superAdmin', 'Class_Coordinator', 'centerIncharge', 'zonalManager', 'zonalHead', 'counsellor', 'teacher'];
        if (!allowedRoles.includes(req.user.role)) {
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
        const courses = await Course.find();
        let teachers, coordinators, centres, batches;
        if (req.user && req.user.role !== 'superAdmin') {
            const userCentres = req.user.centres || [];
            
            // Filter teachers and coordinators by their assigned centres
            teachers = await User.find({ 
                role: "teacher", 
                centres: { $in: userCentres } 
            }).populate('centres', 'centreName');

            coordinators = await User.find({ 
                role: "Class_Coordinator", 
                centres: { $in: userCentres } 
            }).populate('centres', 'centreName');

            centres = await Centre.find({ _id: { $in: userCentres } });
            // Fetch batches for these centres
            batches = await Batch.find({ centreId: { $in: userCentres } });

            // Fallback: If no batches found for assigned centres, return all batches
            if (!batches || batches.length === 0) {
                batches = await Batch.find();
            }
        } else {
            teachers = await User.find({ role: "teacher" }).populate('centres', 'centreName');
            coordinators = await User.find({ role: "Class_Coordinator" }).populate('centres', 'centreName');
            centres = await Centre.find();
            batches = await Batch.find();
        }
        const exams = await ExamTag.find();
        const academicClasses = await AcademicsClass.find();
        const sessions = await Session.find();

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

export const importClassesExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload an excel file" });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "The uploaded excel file is empty." });
        }

        const errors = [];
        const classesToInsert = [];

        // Center authorization logic
        const userRole = req.user.role;
        const userCentres = req.user.centres ? req.user.centres.map(c => c.toString()) : [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // +2 considering header and 0-indexing

            // 1. Check Mandatory string fields
            const requiredFields = ['Class Name', 'Date', 'Class Mode', 'Start Time', 'End Time', 'Center', 'Batch', 'Subject', 'Teacher', 'Session', 'Course'];
            let missingFields = [];
            for (let field of requiredFields) {
                if (!row[field]) missingFields.push(field);
            }
            if (missingFields.length > 0) {
                errors.push(`Row ${rowNumber}: Missing mandatory fields -> ${missingFields.join(", ")}`);
                continue;
            }

            // 2. Validate enums
            const classMode = String(row['Class Mode']).trim();
            if (!["Online", "Offline"].includes(classMode)) {
                errors.push(`Row ${rowNumber}: Class Mode must be exactly 'Online' or 'Offline'`);
                continue;
            }

            // 3. Database Lookups
            // Convert Excel serial date to JS Date if necessary
            let dateObj;
            if (typeof row['Date'] === 'number') {
                dateObj = new Date(Math.round((row['Date'] - 25569) * 86400 * 1000));
            } else {
                dateObj = new Date(row['Date']);
            }
            
            if (isNaN(dateObj.getTime())) {
                errors.push(`Row ${rowNumber}: Invalid date format`);
                continue;
            }

            // Center
            const centreRegex = new RegExp(`^${String(row['Center']).trim()}$`, "i");
            const centre = await Centre.findOne({ $or: [{ centreName: centreRegex }, { name: centreRegex }] });
            if (!centre) {
                errors.push(`Row ${rowNumber}: Center '${row['Center']}' not found`);
                continue;
            }
            if (userRole !== 'superAdmin' && !userCentres.includes(centre._id.toString())) {
                errors.push(`Row ${rowNumber}: You are not authorized to create classes for center '${row['Center']}'`);
                continue;
            }

            // Course
            const courseRegex = new RegExp(`^${String(row['Course']).trim()}$`, "i");
            const course = await Course.findOne({ $or: [{ courseName: courseRegex }, { name: courseRegex }] });
            if (!course) {
                errors.push(`Row ${rowNumber}: Course '${row['Course']}' not found`);
                continue;
            }

            // Exam (Optional)
            let examId = undefined;
            if (row['Exam']) {
                const examRegex = new RegExp(`^${String(row['Exam']).trim()}$`, "i");
                const exam = await ExamTag.findOne({ $or: [{ name: examRegex }, { tagName: examRegex }] });
                if (!exam) {
                    errors.push(`Row ${rowNumber}: Exam '${row['Exam']}' not found`);
                    continue;
                }
                examId = exam._id;
            }

            // Subject
            const subjectRegex = new RegExp(`^${String(row['Subject']).trim()}$`, "i");
            const subject = await AcademicsSubject.findOne({ $or: [{ subjectName: subjectRegex }, { name: subjectRegex }] });
            if (!subject) {
                errors.push(`Row ${rowNumber}: Subject '${row['Subject']}' not found in AcademicsSubject`);
                continue;
            }

            // Teacher
            const teacherRegex = new RegExp(`^${String(row['Teacher']).trim()}$`, "i");
            const teacher = await User.findOne({ name: teacherRegex, role: 'teacher' });
            if (!teacher) {
                errors.push(`Row ${rowNumber}: Teacher exactly matching '${row['Teacher']}' not found in the users list`);
                continue;
            }

            // Session
            const sessionRegex = new RegExp(`^${String(row['Session']).trim()}$`, "i");
            const sessionDoc = await Session.findOne({ sessionName: sessionRegex });
            if (!sessionDoc) {
                errors.push(`Row ${rowNumber}: Session '${row['Session']}' not found`);
                continue;
            }

            // Batches (Comma Separated)
            const batchNames = String(row['Batch']).split(',').map(b => b.trim()).filter(b => b);
            const batchDocs = await Batch.find({ 
                $or: [
                    { batchName: { $in: batchNames.map(b => new RegExp(`^${b}$`, "i")) } },
                    { name: { $in: batchNames.map(b => new RegExp(`^${b}$`, "i")) } }
                ] 
            });
            if (batchDocs.length === 0) {
                errors.push(`Row ${rowNumber}: None of the Batches '${row['Batch']}' were found`);
                continue;
            }
            const batchIds = batchDocs.map(b => b._id);

            // Optional Lookups
            let coordinatorId = undefined;
            if (row['Coordinator']) {
                const coordRegex = new RegExp(`^${String(row['Coordinator']).trim()}$`, "i");
                const coordinator = await User.findOne({ name: coordRegex, role: 'Class_Coordinator' });
                if (!coordinator) {
                    errors.push(`Row ${rowNumber}: Coordinator exactly matching '${row['Coordinator']}' not found`);
                    continue;
                }
                coordinatorId = coordinator._id;
            }

            let acadClassId = undefined;
            if (row['Academic Class']) {
                const acadRegex = new RegExp(`^${String(row['Academic Class']).trim()}$`, "i");
                const acadClass = await AcademicsClass.findOne({ className: acadRegex });
                if (!acadClass) {
                    errors.push(`Row ${rowNumber}: Academic Class '${row['Academic Class']}' not found`);
                    continue;
                }
                acadClassId = acadClass._id;
            }

            classesToInsert.push({
                className: String(row['Class Name']).trim(),
                date: dateObj,
                classMode: classMode,
                startTime: String(row['Start Time']).trim(),
                endTime: String(row['End Time']).trim(),
                subjectId: subject._id,
                teacherId: teacher._id,
                session: sessionDoc.sessionName, // Schema stores string or ObjectId, existing script usually passes string
                examId: examId,
                courseId: course._id,
                centreId: centre._id,
                batchIds: batchIds,
                coordinatorId: coordinatorId,
                acadClassId: acadClassId,
                acadSubjectId: subject._id, // Assume acad subject is the same lookup if available
                chapterName: row['Chapter Name'] ? String(row['Chapter Name']).trim() : "",
                topicName: row['Topic Names'] ? String(row['Topic Names']).trim() : "",
                message: row['Message'] ? String(row['Message']).trim() : "",
                classHours: row['Class Hours'] ? Number(row['Class Hours']) : 0
            });
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (errors.length > 0) {
            return res.status(400).json({ message: "Validation Failed for Excel details.", errors });
        }

        await ClassSchedule.insertMany(classesToInsert);

        res.status(200).json({ message: `Successfully imported ${classesToInsert.length} classes!` });
    } catch (error) {
        console.error("Error importing excels:", error);
        // Ensure to delete file in case of crash
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch(e) {}
        }
        res.status(500).json({ message: "Server error during import", error: error.message });
    }
};
