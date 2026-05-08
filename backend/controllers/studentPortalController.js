import Student from "../models/Students.js";
import Admission from "../models/Admission/Admission.js";
import ClassSchedule from "../models/Academics/ClassSchedule.js";
import StudentAttendance from "../models/Academics/StudentAttendance.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import { getSignedFileUrl } from "../utils/r2Upload.js";
import jwt from "jsonwebtoken";
import { getCache, setCache, generateCacheKey, clearCachePattern } from "../utils/redisCache.js";

// Login: Username (Email) + Password (Admission Number)
export const login = async (req, res) => {
    try {
        const { username, password } = req.body; // username is email, password is admissionNumber

        if (!username || !password) {
            return res.status(400).json({ message: "Username (Email) and Password (Enrollment Number) are required" });
        }

        const email = username; // Map username to email for existing logic

        // 1. Find the admission by Enrollment Number (Password)
        // Admission number is unique enough for login credential
        const admission = await Admission.findOne({ admissionNumber: password });

        if (!admission) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 2. Find the student associated with this admission
        const student = await Student.findById(admission.student);

        if (!student) {
            return res.status(401).json({ message: "Student record not found" });
        }

        // 3. Check if student or admission is deactivated
        if (student.status === "Deactivated") {
            return res.status(403).json({ message: "Your account has been deactivated. Please contact administration." });
        }

        const inactiveStatuses = ["INACTIVE", "CANCELLED"];
        if (inactiveStatuses.includes(admission.admissionStatus)) {
            return res.status(403).json({ message: "This enrollment is no longer active. Please contact administration." });
        }

        // 4. Verify Email matches
        // Check if ANY of the studentsDetails has this email
        const emailMatch = student.studentsDetails.some(
            detail => detail.studentEmail?.toLowerCase() === email.toLowerCase()
        );

        if (!emailMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 4. Generate Token
        const token = jwt.sign(
            { id: student._id, role: "student", admissionId: admission._id },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.json({
            token,
            student: {
                _id: student._id,
                name: student.studentsDetails[0].studentName,
                email: email,
                admissionNumber: admission.admissionNumber
            }
        });

    } catch (error) {
        console.error("Student Login Error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
};

// Get Student Profile
export const getProfile = async (req, res) => {
    try {
        const studentId = req.user.id;
        const student = await Student.findById(studentId)
            .populate("course", "courseName")
            .populate("batches", "batchName"); // Assuming batches ref is correct

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const admissions = await Admission.find({ student: studentId })
            .populate("course", "courseName")
            .populate("class", "className");

        const formattedAdmissions = admissions.map(adm => ({
            _id: adm._id,
            admissionNumber: adm.admissionNumber,
            courseName: adm.course?.courseName || "N/A",
            className: adm.class?.className || "N/A",
            admissionDate: adm.admissionDate,
            paymentStatus: adm.paymentStatus,
            totalFees: adm.totalFees,
            totalPaidAmount: adm.totalPaidAmount
        }));

        const formattedStudent = {
            _id: student._id,
            name: student.studentsDetails[0]?.studentName || "N/A",
            email: student.studentsDetails[0]?.studentEmail || "N/A",
            courseName: student.course?.courseName || "N/A",
            batchNames: student.batches?.map(b => b.batchName) || []
        };

        res.json({
            student: formattedStudent,
            admissions: formattedAdmissions
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get All Classes (History)
export const getClasses = async (req, res) => {
    try {
        let studentId = req.params.studentId || req.user.id;
        const userRole = req.user.role?.toLowerCase() || "";

        // Security check: Students can only view their own classes
        if (req.user.role === "student" && studentId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Access denied. You can only view your own classes." });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const batchIds = student.batches || [];

        const schedule = await ClassSchedule.find({
            $or: [
                { batchIds: { $in: batchIds } },
                { batchId: { $in: batchIds } }
            ]
        })
        .populate("subjectId", "subName")
        .populate("acadClassId", "className")
        .populate({
            path: "acadSubjectId",
            populate: { path: "masterSubjectId", select: "subName" }
        })
        .populate("chapterId", "chapterName")
        .populate("topicIds", "topicName")
        .populate("teacherId", "name email")
        .sort({ date: -1 })
        .limit(100);

        const formattedSchedule = schedule.map(cls => ({
            _id: cls._id,
            className: cls.className,
            date: cls.date,
            startTime: cls.startTime,
            endTime: cls.endTime,
            classMode: cls.classMode,
            status: cls.status,
            teacherName: cls.teacherId?.name || "N/A",
            subjectName: cls.subjectId?.subName || "N/A",
            academicClassName: cls.acadClassId?.className || "N/A",
            academicSubjectName: cls.acadSubjectId?.masterSubjectId?.subName || "N/A",
            chapterName: cls.chapterId?.chapterName || "N/A",
            topics: cls.topicIds?.map(t => t.topicName) || []
        }));

        res.json(formattedSchedule);

    } catch (error) {
        console.error("Get Classes Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Upcoming Classes
export const getUpcomingClasses = async (req, res) => {
    try {
        let studentId = req.params.studentId || req.user.id;

        if (req.user.role === "student" && studentId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        const batchIds = student.batches || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingClasses = await ClassSchedule.find({
            $or: [
                { batchIds: { $in: batchIds } },
                { batchId: { $in: batchIds } }
            ],
            status: "Upcoming",
            date: { $gte: today }
        })
        .populate("subjectId", "subName")
        .populate("acadClassId", "className")
        .populate({
            path: "acadSubjectId",
            populate: { path: "masterSubjectId", select: "subName" }
        })
        .populate("chapterId", "chapterName")
        .populate("topicIds", "topicName")
        .populate("teacherId", "name email designation")
        .sort({ date: 1, startTime: 1 });

        const formatted = upcomingClasses.map(cls => ({
            _id: cls._id,
            className: cls.className,
            date: cls.date,
            startTime: cls.startTime,
            endTime: cls.endTime,
            classMode: cls.classMode,
            status: cls.status,
            teacherName: cls.teacherId?.name || "N/A",
            subjectName: cls.subjectId?.subName || "N/A",
            academicClassName: cls.acadClassId?.className || "N/A",
            academicSubjectName: cls.acadSubjectId?.masterSubjectId?.subName || "N/A",
            chapterName: cls.chapterId?.chapterName || "N/A",
            topics: cls.topicIds?.map(t => t.topicName) || [],
            message: cls.message
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Get Upcoming Classes Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Ongoing Classes
export const getOngoingClasses = async (req, res) => {
    try {
        let studentId = req.params.studentId || req.user.id;

        // Security check
        if (req.user.role === "student" && studentId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        const batchIds = student.batches || [];

        const ongoingClasses = await ClassSchedule.find({
            $or: [
                { batchIds: { $in: batchIds } },
                { batchId: { $in: batchIds } }
            ],
            status: "Ongoing"
        })
        .populate("subjectId", "subName")
        .populate("acadClassId", "className")
        .populate({
            path: "acadSubjectId",
            populate: { path: "masterSubjectId", select: "subName" }
        })
        .populate("chapterId", "chapterName")
        .populate("topicIds", "topicName")
        .populate("teacherId", "name email designation")
        .sort({ date: 1, startTime: 1 });

        const formatted = ongoingClasses.map(cls => ({
            _id: cls._id,
            className: cls.className,
            date: cls.date,
            startTime: cls.startTime,
            endTime: cls.endTime,
            classMode: cls.classMode,
            status: cls.status,
            teacherName: cls.teacherId?.name || "N/A",
            subjectName: cls.subjectId?.subName || "N/A",
            academicClassName: cls.acadClassId?.className || "N/A",
            academicSubjectName: cls.acadSubjectId?.masterSubjectId?.subName || "N/A",
            chapterName: cls.chapterId?.chapterName || "N/A",
            topics: cls.topicIds?.map(t => t.topicName) || [],
            message: cls.message
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Get Ongoing Classes Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Previous Classes (Completed)
export const getPreviousClasses = async (req, res) => {
    try {
        let studentId = req.params.studentId || req.user.id;

        if (req.user.role === "student" && studentId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Access denied." });
        }

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        const batchIds = student.batches || [];

        const previousClasses = await ClassSchedule.find({
            $or: [
                { batchIds: { $in: batchIds } },
                { batchId: { $in: batchIds } }
            ],
            status: "Completed"
        })
        .populate("subjectId", "subName")
        .populate("acadClassId", "className")
        .populate({
            path: "acadSubjectId",
            populate: { path: "masterSubjectId", select: "subName" }
        })
        .populate("chapterId", "chapterName")
        .populate("topicIds", "topicName")
        .populate("teacherId", "name email designation")
        .sort({ date: -1, startTime: -1 })
        .limit(50);

        // Fetch attendance for these classes
        const classIds = previousClasses.map(c => c._id);
        const attendanceRecords = await StudentAttendance.find({
            studentId,
            classScheduleId: { $in: classIds }
        });

        const formatted = previousClasses.map(cls => {
            const attendance = attendanceRecords.find(r => r.classScheduleId.toString() === cls._id.toString());
            return {
                _id: cls._id,
                className: cls.className,
                date: cls.date,
                startTime: cls.startTime,
                endTime: cls.endTime,
                classMode: cls.classMode,
                status: cls.status,
                teacherName: cls.teacherId?.name || "N/A",
                subjectName: cls.subjectId?.subName || "N/A",
                academicClassName: cls.acadClassId?.className || "N/A",
                academicSubjectName: cls.acadSubjectId?.masterSubjectId?.subName || "N/A",
                chapterName: cls.chapterId?.chapterName || "N/A",
                topics: cls.topicIds?.map(t => t.topicName) || [],
                attendanceStatus: attendance ? attendance.status : "Not Marked"
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error("Get Previous Classes Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Attendance
export const getAttendance = async (req, res) => {
    try {
        let studentId = req.user.id;
        
        // If an admin/teacher requests a specific student's attendance
        const userRole = req.user.role?.toLowerCase() || "";
        if (req.query.studentId && ["admin", "superadmin", "teacher", "hod"].includes(userRole)) {
            studentId = req.query.studentId;
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const batchIds = student.batches || [];

        // 1. Fetch all classes scheduled for the student's batches
        const classes = await ClassSchedule.find({
            $or: [
                { batchIds: { $in: batchIds } },
                { batchId: { $in: batchIds } }
            ]
        })
        .populate("subjectId", "subName")
        .populate("acadClassId", "className")
        .populate({
            path: "acadSubjectId",
            populate: { path: "masterSubjectId", select: "subName" }
        })
        .populate("chapterId", "chapterName")
        .populate("topicIds", "topicName")
        .populate("teacherId", "name email designation")
        .sort({ date: -1 });

        // 2. Fetch all attendance records for this student
        const attendanceRecords = await StudentAttendance.find({ studentId });

        // 3. Merge attendance status into the class schedule
        const detailedAttendance = classes.map(cls => {
            const record = attendanceRecords.find(r => r.classScheduleId.toString() === cls._id.toString());
            const clsObj = cls.toObject();
            
            return {
                ...clsObj,
                subjectName: cls.subjectId?.subName || "N/A",
                academicClassName: cls.acadClassId?.className || "N/A",
                academicSubjectName: cls.acadSubjectId?.masterSubjectId?.subName || "N/A",
                academicChapterName: cls.chapterId?.chapterName || "N/A",
                academicTopicNames: cls.topicIds?.map(t => t.topicName) || [],
                teacherName: cls.teacherId?.name || "N/A",
                attendanceStatus: record ? record.status : "Not Marked",
                attendanceMarkedDate: record ? record.createdAt : null
            };
        });

        res.json({
            success: true,
            totalClasses: detailedAttendance.length,
            presentCount: attendanceRecords.filter(r => r.status === "Present").length,
            absentCount: attendanceRecords.filter(r => r.status === "Absent").length,
            data: detailedAttendance
        });

    } catch (error) {
        console.error("Get Detailed Attendance Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get Complete Single Student Report (Profile + Admissions + Detailed Attendance)
export const getSingleStudentReport = async (req, res) => {
    try {
        let studentId = req.params.studentId || req.user.id;

        // Security: Students can ONLY query their own ID
        if (req.user.role === "student" && studentId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Access denied. You can only view your own report." });
        }

        // REDIS CACHING
        const cacheKey = `student:report:${studentId}`;
        const cachedReport = await getCache(cacheKey);
        if (cachedReport) {
            return res.status(200).json(cachedReport);
        }

        // 1. Fetch Student Profile
        const student = await Student.findById(studentId)
            .populate("course")
            .populate("batches");

        if (!student) {
            return res.status(404).json({ message: "Student record not found" });
        }

        // 2. Fetch Admissions
        const admissions = await Admission.find({ student: studentId })
            .populate("course")
            .populate("class");

        // 3. Fetch Detailed Attendance & Schedule
        const batchIds = student.batches || [];
        const classes = await ClassSchedule.find({
            $or: [
                { batchIds: { $in: batchIds } },
                { batchId: { $in: batchIds } }
            ]
        })
        .populate("subjectId", "subName")
        .populate("acadClassId", "className")
        .populate({
            path: "acadSubjectId",
            populate: { path: "masterSubjectId", select: "subName" }
        })
        .populate("chapterId", "chapterName")
        .populate("topicIds", "topicName")
        .populate("teacherId", "name email designation")
        .sort({ date: -1 });

        const attendanceRecords = await StudentAttendance.find({ studentId });

        const detailedAttendance = classes.map(cls => {
            const record = attendanceRecords.find(r => r.classScheduleId.toString() === cls._id.toString());
            const clsObj = cls.toObject();
            return {
                ...clsObj,
                subjectName: cls.subjectId?.subName || "N/A",
                academicClassName: cls.acadClassId?.className || "N/A",
                academicSubjectName: cls.acadSubjectId?.masterSubjectId?.subName || "N/A",
                academicChapterName: cls.chapterId?.chapterName || "N/A",
                academicTopicNames: cls.topicIds?.map(t => t.topicName) || [],
                teacherName: cls.teacherId?.name || "N/A",
                attendanceStatus: record ? record.status : "Not Marked",
                attendanceMarkedDate: record ? record.createdAt : null
            };
        });

        const reportData = {
            success: true,
            profile: {
                _id: student._id,
                name: student.studentsDetails[0]?.studentName || "N/A",
                email: student.studentsDetails[0]?.studentEmail || "N/A",
                courseName: student.course?.courseName || "N/A",
                batchNames: student.batches?.map(b => b.batchName) || []
            },
            admissions: admissions.map(adm => ({
                _id: adm._id,
                admissionNumber: adm.admissionNumber,
                courseName: adm.course?.courseName || "N/A",
                className: adm.class?.className || "N/A"
            })),
            attendanceReport: {
                totalClasses: detailedAttendance.length,
                presentCount: attendanceRecords.filter(r => r.status === "Present").length,
                absentCount: attendanceRecords.filter(r => r.status === "Absent").length,
                classes: detailedAttendance.map(cls => ({
                    _id: cls._id,
                    className: cls.className,
                    date: cls.date,
                    startTime: cls.startTime,
                    endTime: cls.endTime,
                    teacherName: cls.teacherId?.name || "N/A",
                    subjectName: cls.subjectId?.subName || "N/A",
                    attendanceStatus: cls.attendanceStatus
                }))
            }
        };

        // Cache for 30 minutes
        await setCache(cacheKey, reportData, 1800);

        res.json(reportData);

    } catch (error) {
        console.error("Single Student Report Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get All Teachers (accessible by Students, Admins, and SuperAdmins)
export const getTeachers = async (req, res) => {
    try {
        const allowedRoles = ["student", "admin", "superAdmin", "teacher", "HOD"];
        const userRole = req.user.role?.toLowerCase() || "";

        if (!allowedRoles.includes(userRole) && userRole !== "superadmin") {
            return res.status(403).json({ message: "Access denied." });
        }

        // Find users with role 'teacher' or 'HOD'
        const teachers = await User.find({ role: { $in: ["teacher", "HOD"] } })
            .select("name email mobNum subject designation teacherDepartment boardType teacherType centres isDeptHod isBoardHod isSubjectHod")
            .populate("centres", "centreName")
            .sort({ name: 1 });

        // Fetch profile images and additional bio from Employee model
        const teachersWithImages = await Promise.all(teachers.map(async (teacher) => {
            const teachObj = teacher.toObject();
            const employee = await Employee.findOne({ user: teacher._id })
                .select("profileImage department designation dateOfJoining typeOfEmployment gender bloodGroup");

            if (employee) {
                if (employee.profileImage) {
                    try {
                        teachObj.profileImage = await getSignedFileUrl(employee.profileImage);
                    } catch (err) {
                        console.warn(`Could not sign URL for teacher ${teacher.name}:`, err.message);
                        teachObj.profileImage = null;
                    }
                }
                teachObj.academicInfo = {
                    joiningDate: employee.dateOfJoining,
                    employmentType: employee.typeOfEmployment,
                    gender: employee.gender,
                    bloodGroup: employee.bloodGroup
                };
            } else {
                teachObj.profileImage = null;
                teachObj.academicInfo = null;
            }
            return teachObj;
        }));

        res.status(200).json(teachersWithImages);
    } catch (error) {
        console.error("Get Teachers Student Portal Error:", error);
        res.status(500).json({ message: "Server error fetching teachers" });
    }
};
