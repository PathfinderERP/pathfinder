import mongoose from "mongoose";
import Admission from "../../models/Admission/Admission.js";
import Student from "../../models/Students.js";
import Course from "../../models/Master_data/Courses.js";
import Class from "../../models/Master_data/Class.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Department from "../../models/Master_data/Department.js";
import Boards from "../../models/Master_data/Boards.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import { clearCachePattern, deleteCache } from "../../utils/redisCache.js";
import { resolveCanonicalCentreName } from "../../services/admissionCentreSyncService.js";

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

        let admission;

        if (isBoard) {
            // ==========================================
            // BOARD COURSE ADMISSION UPDATE
            // Kept strictly independent from Enrolled Students (Normal Admissions).
            // Updates apply ONLY to this BoardCourseAdmission document.
            // ==========================================
            const boardUpdates = {};

            const incomingName = updates.studentName || updates.studentsDetails?.[0]?.studentName;
            const incomingPhone = updates.mobileNum || updates.phoneNumber || updates.studentsDetails?.[0]?.mobileNum;
            const incomingEmail = updates.studentEmail || updates.email || updates.studentsDetails?.[0]?.studentEmail;
            const incomingWhatsapp = updates.whatsappNumber || updates.studentsDetails?.[0]?.whatsappNumber;
            const incomingAddress = updates.address || updates.studentsDetails?.[0]?.address;

            if (incomingName) boardUpdates.studentName = incomingName.trim();
            if (incomingPhone) boardUpdates.mobileNum = incomingPhone.trim();
            if (incomingEmail !== undefined) boardUpdates.studentEmail = incomingEmail ? incomingEmail.trim() : "";
            if (incomingWhatsapp !== undefined) boardUpdates.whatsappNumber = incomingWhatsapp ? incomingWhatsapp.trim() : "";
            if (incomingAddress !== undefined) boardUpdates.address = incomingAddress ? incomingAddress.trim() : "";

            if (updates.dateOfBirth !== undefined) boardUpdates.dateOfBirth = updates.dateOfBirth;
            if (updates.gender !== undefined) boardUpdates.gender = updates.gender;
            if (updates.schoolName !== undefined) boardUpdates.schoolName = updates.schoolName ? updates.schoolName.trim() : "";
            if (updates.state !== undefined) boardUpdates.state = updates.state ? updates.state.trim() : "";
            if (updates.pincode !== undefined) boardUpdates.pincode = updates.pincode ? updates.pincode.trim() : "";
            if (updates.programme !== undefined) boardUpdates.programme = updates.programme;
            if (updates.guardians) boardUpdates.guardians = updates.guardians;
            if (updates.markAggregate !== undefined) boardUpdates.markAggregate = updates.markAggregate;
            if (updates.scienceMathPercent !== undefined) boardUpdates.scienceMathPercent = updates.scienceMathPercent;
            if (updates.remarks !== undefined) boardUpdates.remarks = updates.remarks;

            if (updates.centre) {
                const canonical = await resolveCanonicalCentreName(updates.centre);
                boardUpdates.centre = canonical || updates.centre;
            }
            if (updates.academicSession) boardUpdates.academicSession = updates.academicSession;

            if (updates.examTag) {
                if (mongoose.Types.ObjectId.isValid(updates.examTag)) {
                    boardUpdates.examTag = updates.examTag;
                } else {
                    const tagDoc = await ExamTag.findOne({
                        $or: [
                            { name: { $regex: new RegExp(`^${String(updates.examTag).trim()}$`, "i") } },
                            { tagName: { $regex: new RegExp(`^${String(updates.examTag).trim()}$`, "i") } }
                        ]
                    });
                    if (tagDoc) {
                        boardUpdates.examTag = tagDoc._id;
                    }
                }
            }

            if (updates.createdBy && mongoose.Types.ObjectId.isValid(updates.createdBy)) {
                boardUpdates.createdBy = updates.createdBy;
            }

            if (updates.department) {
                if (mongoose.Types.ObjectId.isValid(updates.department)) {
                    boardUpdates.department = updates.department;
                } else {
                    const deptDoc = await Department.findOne({
                        $or: [
                            { departmentName: { $regex: new RegExp(`^${String(updates.department).trim()}$`, "i") } },
                            { name: { $regex: new RegExp(`^${String(updates.department).trim()}$`, "i") } }
                        ]
                    });
                    if (deptDoc) {
                        boardUpdates.department = deptDoc._id;
                    }
                }
            }

            if (updates.class) {
                if (mongoose.Types.ObjectId.isValid(updates.class)) {
                    const classDoc = await Class.findById(updates.class);
                    if (classDoc) {
                        boardUpdates.lastClass = classDoc.className || classDoc.name;
                    } else {
                        boardUpdates.lastClass = String(updates.class);
                    }
                } else {
                    boardUpdates.lastClass = String(updates.class);
                }
            } else if (updates.lastClass) {
                boardUpdates.lastClass = String(updates.lastClass);
            }

            if (updates.course) {
                if (mongoose.Types.ObjectId.isValid(updates.course)) {
                    const courseDoc = await Course.findById(updates.course);
                    if (courseDoc) {
                        boardUpdates.boardCourseName = courseDoc.courseName;
                    } else {
                        boardUpdates.boardCourseName = String(updates.course);
                    }
                } else {
                    boardUpdates.boardCourseName = String(updates.course);
                }
            } else if (updates.boardCourseName) {
                boardUpdates.boardCourseName = String(updates.boardCourseName);
            }

            if (updates.boardId && mongoose.Types.ObjectId.isValid(updates.boardId)) {
                boardUpdates.boardId = updates.boardId;
            } else if (updates.board) {
                if (mongoose.Types.ObjectId.isValid(updates.board)) {
                    boardUpdates.boardId = updates.board;
                } else {
                    const boardDoc = await Boards.findOne({
                        $or: [
                            { boardName: { $regex: new RegExp(`^${String(updates.board).trim()}$`, "i") } },
                            { boardCourse: { $regex: new RegExp(`^${String(updates.board).trim()}$`, "i") } }
                        ]
                    });
                    if (boardDoc) {
                        boardUpdates.boardId = boardDoc._id;
                    }
                }
            }

            // Enrollment Number (Admission Number) for Board Admission
            if (updates.admissionNumber) {
                const trimmedNumber = updates.admissionNumber.trim().toUpperCase();
                // Validate duplicate against OTHER Board Course Admissions only
                const existingForOtherBoard = await BoardCourseAdmission.findOne({
                    admissionNumber: trimmedNumber,
                    _id: { $ne: id }
                });
                if (existingForOtherBoard) {
                    return res.status(409).json({
                        message: `Enrollment number "${trimmedNumber}" is already assigned to another board course admission.`
                    });
                }
                boardUpdates.admissionNumber = trimmedNumber;
            }

            const updatedBoardDoc = await BoardCourseAdmission.findByIdAndUpdate(
                id,
                { $set: boardUpdates },
                { new: true, runValidators: true }
            )
            .populate({
                path: 'studentId',
                populate: [
                    { path: 'batches' },
                    { path: 'allocatedItems.allocatedBy', select: 'name' },
                    { path: 'department' }
                ]
            })
            .populate('boardId')
            .populate('department')
            .populate('createdBy', 'name');

            if (!updatedBoardDoc) {
                return res.status(404).json({ message: "Admission not found" });
            }

            // Map to the standardized admission structure
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

        } else {
            // ==========================================
            // NORMAL ADMISSION UPDATE (Enrolled Students)
            // Kept strictly independent from Board Course Admissions.
            // ==========================================

            // Synchronize student personal details only to Student collection
            const incomingName = updates.studentName || updates.studentsDetails?.[0]?.studentName;
            const incomingPhone = updates.mobileNum || updates.phoneNumber || updates.studentsDetails?.[0]?.mobileNum;
            const incomingEmail = updates.studentEmail || updates.email || updates.studentsDetails?.[0]?.studentEmail;
            const incomingWhatsapp = updates.whatsappNumber || updates.studentsDetails?.[0]?.whatsappNumber;
            const incomingAddress = updates.address || updates.studentsDetails?.[0]?.address;

            if (incomingName || incomingPhone || incomingEmail || incomingWhatsapp || incomingAddress) {
                const studentSet = {};
                if (incomingName) studentSet['studentsDetails.0.studentName'] = incomingName.trim();
                if (incomingPhone) studentSet['studentsDetails.0.mobileNum'] = incomingPhone.trim();
                if (incomingEmail) studentSet['studentsDetails.0.studentEmail'] = incomingEmail.trim();
                if (incomingWhatsapp) studentSet['studentsDetails.0.whatsappNumber'] = incomingWhatsapp.trim();
                if (incomingAddress) studentSet['studentsDetails.0.address'] = incomingAddress.trim();

                await Student.findByIdAndUpdate(studentId, { $set: studentSet });
            }

            // Synchronize department to Student document
            if (updates.department && mongoose.Types.ObjectId.isValid(updates.department)) {
                await Student.findByIdAndUpdate(studentId, { department: updates.department });
            }

            // If admissionNumber is being updated, perform conflict checks and update normal admissions
            if (updates.admissionNumber) {
                const trimmedNumber = updates.admissionNumber.trim().toUpperCase();
                updates.admissionNumber = trimmedNumber;

                // Check for duplicates among OTHER students in normal Admission collection
                const existingForOtherStudentNormal = await Admission.findOne({
                    admissionNumber: trimmedNumber,
                    student: { $ne: studentId }
                });

                if (existingForOtherStudentNormal) {
                    return res.status(409).json({
                        message: `Enrollment number "${trimmedNumber}" is already assigned to another student.`
                    });
                }

                // Update only normal admissions for this student
                await Admission.updateMany(
                    { student: studentId },
                    { admissionNumber: trimmedNumber }
                );
            }

            // Synchronize centre across normal admissions and student profile
            if (updates.centre) {
                const canonicalCentre = await resolveCanonicalCentreName(updates.centre);
                if (canonicalCentre) {
                    updates.centre = canonicalCentre;
                    await Admission.updateMany(
                        { student: studentId },
                        { $set: { centre: canonicalCentre } }
                    );
                    await Student.updateOne(
                        { _id: studentId },
                        { $set: { "studentsDetails.0.centre": canonicalCentre, centre: canonicalCentre } }
                    );
                }
            }

            // Sync examTag updates to student's sessionExamCourse
            if (updates.examTag && mongoose.Types.ObjectId.isValid(updates.examTag)) {
                const examTagDoc = await ExamTag.findById(updates.examTag);
                if (examTagDoc) {
                    const newTagName = examTagDoc.tagName || examTagDoc.name;
                    const student = await Student.findById(studentId);
                    if (student) {
                        const session = updates.academicSession || currentAdmission.academicSession;
                        if (!student.sessionExamCourse) student.sessionExamCourse = [];
                        const matchIdx = student.sessionExamCourse.findIndex(sec => sec.session === session);
                        if (matchIdx !== -1) {
                            student.sessionExamCourse[matchIdx].examTag = newTagName;
                        } else {
                            student.sessionExamCourse.push({
                                session: session,
                                examTag: newTagName,
                                targetExams: ""
                            });
                        }
                        student.markModified('sessionExamCourse');
                        await student.save();
                    }
                }
            }

            // Clean updates before passing to findByIdAndUpdate for normal admission
            const normalUpdates = { ...updates };
            if (normalUpdates.class && !mongoose.Types.ObjectId.isValid(normalUpdates.class)) {
                delete normalUpdates.class;
            }
            if (normalUpdates.course && !mongoose.Types.ObjectId.isValid(normalUpdates.course)) {
                delete normalUpdates.course;
            }
            if (normalUpdates.examTag && !mongoose.Types.ObjectId.isValid(normalUpdates.examTag)) {
                delete normalUpdates.examTag;
            }
            if (normalUpdates.department && !mongoose.Types.ObjectId.isValid(normalUpdates.department)) {
                delete normalUpdates.department;
            }

            admission = await Admission.findByIdAndUpdate(
                id,
                normalUpdates,
                { new: true, runValidators: true }
            )
                .populate({
                    path: 'student',
                    populate: [
                        { path: 'batches' },
                        { path: 'allocatedItems.allocatedBy', select: 'name' }
                    ]
                })
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
