import Student from "../models/Students.js";
import Admission from "../models/Admission/Admission.js";
import ClassSchedule from "../models/Academics/ClassSchedule.js";
import StudentAttendance from "../models/Academics/StudentAttendance.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import { getSignedFileUrl } from "../utils/r2Upload.js";
import jwt from "jsonwebtoken";

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
            .populate("course")
            .populate("batches"); // Assuming batches ref is correct

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Also fetch active admissions for this student
        const admissions = await Admission.find({ student: studentId })
            .populate("course")
            .populate("class");

        res.json({
            student,
            admissions
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Classes
export const getClasses = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Access denied. Student role required." });
        }

        const studentId = req.user.id;
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        let batchIds = student.batches || [];

        // Find classes where batchIds (array) contains any of student's batches
        // OR class.batchId (single) is in student's batches

        const schedule = await ClassSchedule.find({
            $or: [
                { batchIds: { $in: batchIds } },
                { batchId: { $in: batchIds } }
            ]
        })
            .populate("subjectId", "subjectName")
            .populate("teacherId", "name email")
            .sort({ date: -1 })
            .limit(100);

        res.json(schedule);

    } catch (error) {
        console.error("Get Classes Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Attendance
export const getAttendance = async (req, res) => {
    try {
        const studentId = req.user.id;

        const attendance = await StudentAttendance.find({ studentId })
            .populate({
                path: "classScheduleId",
                select: "date startTime endTime className subjectId",
                populate: { path: "subjectId", select: "subjectName" }
            })
            .sort({ date: -1 });

        res.json(attendance);

    } catch (error) {
        console.error("Get Attendance Error:", error);
        res.status(500).json({ message: "Server error" });
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
