import Admission from "../../models/Admission/Admission.js";
import Student from "../../models/Students.js";
import Course from "../../models/Master_data/Courses.js";
import Class from "../../models/Master_data/Class.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Department from "../../models/Master_data/Department.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import { clearCachePattern, deleteCache } from "../../utils/redisCache.js";

export const updateAdmission = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Fetch the current admission to get student ID (either normal or board)
        let currentAdmission = await Admission.findById(id);
        let isBoard = false;

        if (!currentAdmission) {
            currentAdmission = await BoardCourseAdmission.findById(id);
            if (!currentAdmission) {
                return res.status(404).json({ message: "Admission not found" });
            }
            isBoard = true;
        }

        const studentId = isBoard ? currentAdmission.studentId : currentAdmission.student;

        // If admissionNumber is being updated, perform synchronization and conflict checks
        if (updates.admissionNumber) {
            const trimmedNumber = updates.admissionNumber.trim().toUpperCase();
            updates.admissionNumber = trimmedNumber;

            // Check for duplicates among OTHER students
            const existingForOtherStudentNormal = await Admission.findOne({
                admissionNumber: trimmedNumber,
                student: { $ne: studentId }
            });
            const existingForOtherStudentBoard = await BoardCourseAdmission.findOne({
                admissionNumber: trimmedNumber,
                studentId: { $ne: studentId }
            });

            if (existingForOtherStudentNormal || existingForOtherStudentBoard) {
                return res.status(409).json({
                    message: `Enrollment number "${trimmedNumber}" is already assigned to another student.`
                });
            }

            // Synchronize across ALL admissions for this student
            await Admission.updateMany(
                { student: studentId },
                { admissionNumber: trimmedNumber }
            );
            await BoardCourseAdmission.updateMany(
                { studentId: studentId },
                { admissionNumber: trimmedNumber }
            );
        }

        // Synchronize centre across ALL admissions for this student if it's being updated
        if (updates.centre) {
            await Admission.updateMany(
                { student: studentId },
                { centre: updates.centre }
            );
            await BoardCourseAdmission.updateMany(
                { studentId: studentId },
                { centre: updates.centre }
            );
        }

        let admission;
        if (isBoard) {
            const boardUpdates = { centre: updates.centre };
            if (updates.academicSession) boardUpdates.academicSession = updates.academicSession;
            
            if (updates.class) {
                const classDoc = await Class.findById(updates.class);
                if (classDoc) {
                    boardUpdates.lastClass = classDoc.className || classDoc.name;
                }
            }
            if (updates.course) {
                const courseDoc = await Course.findById(updates.course);
                if (courseDoc) {
                    boardUpdates.boardCourseName = courseDoc.courseName;
                }
            }

            const updatedBoardDoc = await BoardCourseAdmission.findByIdAndUpdate(
                id,
                boardUpdates,
                { new: true, runValidators: true }
            )
            .populate({
                path: 'studentId',
                populate: [
                    { path: 'batches' },
                    { path: 'allocatedItems.allocatedBy', select: 'name' }
                ]
            })
            .populate('boardId')
            .populate('createdBy', 'name');

            if (updatedBoardDoc) {
                // Map to the normal admission structure
                admission = {
                    ...updatedBoardDoc.toObject(),
                    student: updatedBoardDoc.studentId,
                    board: updatedBoardDoc.boardId,
                    admissionType: "BOARD",
                    admissionDate: updatedBoardDoc.admissionDate || updatedBoardDoc.createdAt,
                    totalFees: updatedBoardDoc.totalExpectedAmount,
                    totalPaidAmount: updatedBoardDoc.totalPaidAmount,
                    paymentStatus: updatedBoardDoc.totalPaidAmount >= updatedBoardDoc.totalExpectedAmount ? "COMPLETED" : (updatedBoardDoc.totalPaidAmount > 0 ? "PARTIAL" : "PENDING"),
                    admissionStatus: updatedBoardDoc.status || "ACTIVE"
                };
            }
        } else {
            admission = await Admission.findByIdAndUpdate(
                id,
                updates,
                { new: true, runValidators: true }
            )
                .populate('student')
                .populate('course')
                .populate('class')
                .populate('examTag')
                .populate('department')
                .populate('createdBy', 'name');
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        const checkStudent = isBoard ? admission.studentId : admission.student;
        if (checkStudent && checkStudent.status === 'Deactivated') {
            return res.status(400).json({ message: "This student is deactivated. Updates are restricted." });
        }

        // Invalidate admissions list cache
        await clearCachePattern("admissions:list:*");
        // Invalidate specific student report cache
        await deleteCache(`student:report:${studentId}`);

        res.status(200).json({
            message: "Admission updated successfully",
            admission
        });
    } catch (err) {
        console.error("updateAdmission error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
