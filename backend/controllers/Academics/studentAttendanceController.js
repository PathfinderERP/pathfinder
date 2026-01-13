import StudentAttendance from "../../models/Academics/StudentAttendance.js";
import ClassSchedule from "../../models/Academics/ClassSchedule.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";

// Fetch students for batches related to a class schedule
export const getStudentsForAttendance = async (req, res) => {
    try {
        const { classScheduleId } = req.params;
        const schedule = await ClassSchedule.findById(classScheduleId).populate("batchIds");

        if (!schedule) {
            return res.status(404).json({ message: "Class schedule not found" });
        }

        // Support legacy batchId
        const batchIds = (schedule.batchIds && schedule.batchIds.length > 0)
            ? schedule.batchIds
            : (schedule.batchId ? [schedule.batchId] : []);

        // Fetch students enrolled in these batches (Only Active students)
        const students = await Student.find({
            batches: { $in: batchIds },
            isEnrolled: true,
            status: "Active"
        }).populate("course").select("studentsDetails examSchema batches course isEnrolled status");

        // Fetch admissions for these students to get admissionNumber
        const studentIds = students.map(s => s._id);
        const admissions = await Admission.find({ student: { $in: studentIds } }, { student: 1, admissionNumber: 1 });
        const admissionMap = {};
        admissions.forEach(adm => {
            if (adm.student) {
                admissionMap[adm.student.toString()] = adm.admissionNumber;
            }
        });

        // Format data grouping by batches
        const batchWiseStudents = batchIds.map(batch => {
            const batchIdStr = batch._id ? batch._id.toString() : batch.toString();
            const batchStudents = students.filter(student =>
                student.batches.some(b => b.toString() === batchIdStr)
            ).map(student => {
                const sObj = student.toObject();
                // Priority: 1. Admission Model, 2. Student Details, 3. N/A
                sObj.admissionNumber = admissionMap[student._id.toString()] ||
                    student.studentsDetails?.[0]?.studentAdmissionNumber ||
                    "N/A";
                return sObj;
            });

            return {
                batchId: batchIdStr,
                batchName: batch.batchName || batch.name || "Batch",
                students: batchStudents
            };
        });

        // Check if attendance is already saved
        const existingAttendance = await StudentAttendance.find({ classScheduleId });

        res.status(200).json({
            schedule,
            batchWiseStudents,
            existingAttendance,
            isSaved: schedule.isStudentAttendanceSaved
        });
    } catch (error) {
        console.error("Error fetching students for attendance:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Save student attendance
export const saveStudentAttendance = async (req, res) => {
    try {
        const { classScheduleId } = req.params;
        const { attendanceData } = req.body; // Array of { studentId, batchId, status }

        const schedule = await ClassSchedule.findById(classScheduleId);
        if (!schedule) {
            return res.status(404).json({ message: "Class schedule not found" });
        }

        // Permission Check: Only Class Coordinator or Admin/SuperAdmin
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'Class_Coordinator') {
            return res.status(403).json({ message: "Only Class Coordinators or Admins can mark student attendance" });
        }

        // Use bulkWrite for efficiency or a loop with upsert
        const operations = attendanceData.map(record => ({
            updateOne: {
                filter: { classScheduleId, studentId: record.studentId },
                update: {
                    $set: {
                        batchId: record.batchId,
                        status: record.status,
                        date: schedule.date,
                        markedBy: req.user.id
                    }
                },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            await StudentAttendance.bulkWrite(operations);
        }

        // Mark student attendance as saved in schedule
        schedule.isStudentAttendanceSaved = true;
        await schedule.save();

        res.status(200).json({ message: "Student attendance saved successfully" });
    } catch (error) {
        console.error("Error saving student attendance:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
