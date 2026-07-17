import Admission from "../../models/Admission/Admission.js";
import Student from "../../models/Students.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Class from "../../models/Master_data/Class.js";
import { clearCachePattern, deleteCache } from "../../utils/redisCache.js";

export const bulkUpdateAdmissions = async (req, res) => {
    try {
        const { ids, updateData } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No admission IDs provided for bulk update" });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No update data provided" });
        }

        // Clean up optional fields that might be empty strings from frontend
        const cleanUpdateData = { ...updateData };

        // No-op here, courseDeactivation handled inside the loop to avoid deactivating the main student profile status.

        const optionalFields = ['class', 'examTag', 'department', 'course'];
        optionalFields.forEach(field => {
            if (cleanUpdateData[field] === "") {
                cleanUpdateData[field] = null;
            }
        });

        // Fetch ExamTag and Class details once before the loop (avoiding N+1 queries)
        let examTagName = null;
        if (cleanUpdateData.examTag) {
            const tagObj = await ExamTag.findById(cleanUpdateData.examTag);
            if (tagObj) {
                examTagName = tagObj.name;
            }
        }

        let classNameStr = null;
        if (cleanUpdateData.class) {
            const classObj = await Class.findById(cleanUpdateData.class);
            if (classObj) {
                classNameStr = classObj.name || classObj.className;
            }
        }

        let modifiedCount = 0;

        for (const admissionId of ids) {
            const admission = await Admission.findById(admissionId);
            if (!admission) continue;

            const studentId = admission.student;

            // Prepare admission updates
            const admissionUpdates = {};
            if (cleanUpdateData.academicSession !== undefined) admissionUpdates.academicSession = cleanUpdateData.academicSession;
            if (cleanUpdateData.class !== undefined) admissionUpdates.class = cleanUpdateData.class;
            if (cleanUpdateData.department !== undefined) admissionUpdates.department = cleanUpdateData.department;
            if (cleanUpdateData.course !== undefined) admissionUpdates.course = cleanUpdateData.course;
            if (cleanUpdateData.examTag !== undefined) admissionUpdates.examTag = cleanUpdateData.examTag;
            if (cleanUpdateData.admissionStatus !== undefined) admissionUpdates.admissionStatus = cleanUpdateData.admissionStatus;
            if (cleanUpdateData.createdBy !== undefined) admissionUpdates.createdBy = cleanUpdateData.createdBy; // Admitted By

            if (cleanUpdateData.courseDeactivation === "DEACTIVATE") {
                admissionUpdates.admissionStatus = "INACTIVE";
            } else if (cleanUpdateData.courseDeactivation === "REACTIVATE") {
                admissionUpdates.admissionStatus = "ACTIVE";
            }

            // Sync Centre across all admissions of the student and on the student record
            if (cleanUpdateData.centre !== undefined) {
                admissionUpdates.centre = cleanUpdateData.centre;

                // Sync to all admissions for this student
                if (studentId) {
                    await Admission.updateMany(
                        { student: studentId },
                        { centre: cleanUpdateData.centre }
                    );
                }
            }

            // Sync to Student profile details and vectors
            if (studentId) {
                const student = await Student.findById(studentId);
                if (student) {
                    let studentModified = false;

                    // Sync Centre
                    if (cleanUpdateData.centre !== undefined) {
                        if (student.studentsDetails && student.studentsDetails[0]) {
                            student.studentsDetails[0].centre = cleanUpdateData.centre;
                            student.markModified('studentsDetails');
                            studentModified = true;
                        }
                    }

                    // Sync Board
                    if (cleanUpdateData.board !== undefined) {
                        if (student.studentsDetails && student.studentsDetails[0]) {
                            student.studentsDetails[0].board = cleanUpdateData.board;
                            student.markModified('studentsDetails');
                            studentModified = true;
                        }
                    }

                    // Sync Counselled By
                    if (cleanUpdateData.counselledBy !== undefined) {
                        student.counselledBy = cleanUpdateData.counselledBy;
                        studentModified = true;
                    }

                    // Sync Course
                    if (cleanUpdateData.course !== undefined) {
                        student.course = cleanUpdateData.course;
                        studentModified = true;
                    }

                    // Sync Department
                    if (cleanUpdateData.department !== undefined) {
                        student.department = cleanUpdateData.department;
                        studentModified = true;
                    }

                    // Sync Student status & shift installments if reactivating
                    if (cleanUpdateData.admissionStatus !== undefined) {
                        if (cleanUpdateData.admissionStatus === 'INACTIVE') {
                            student.status = 'Deactivated';
                            student.deactivationDate = new Date();
                            student.deactivatedBy = req.user?.name || 'System';
                            student.deactivatedByUserId = req.user?._id || req.user?.id || null;
                            studentModified = true;
                        } else if (cleanUpdateData.admissionStatus === 'ACTIVE') {
                            if (student.status === 'Deactivated') {
                                const deactivationDate = student.deactivationDate;
                                const now = new Date();
                                const daysDeactivated = deactivationDate 
                                    ? Math.floor((now - new Date(deactivationDate)) / (1000 * 60 * 60 * 24)) 
                                    : 0;

                                if (daysDeactivated > 0) {
                                    admission.paymentBreakdown.forEach(inst => {
                                        if (inst.status === 'PENDING' || inst.status === 'OVERDUE') {
                                            const oldDueDate = new Date(inst.dueDate);
                                            oldDueDate.setDate(oldDueDate.getDate() + daysDeactivated);
                                            inst.dueDate = oldDueDate;
                                            if (inst.status === 'OVERDUE' && oldDueDate > now) {
                                                inst.status = 'PENDING';
                                            }
                                        }
                                    });
                                    admission.markModified('paymentBreakdown');
                                }
                                student.status = 'Active';
                                student.deactivationDate = null;
                                student.deactivatedBy = null;
                                student.deactivatedByUserId = null;
                                studentModified = true;
                            }
                        }
                    }

                    // Sync Academic Vector (examSchema & sessionExamCourse)
                    if (cleanUpdateData.academicSession !== undefined || cleanUpdateData.examTag !== undefined || cleanUpdateData.class !== undefined) {
                        if (!student.examSchema) student.examSchema = [];
                        if (student.examSchema.length === 0) student.examSchema.push({});

                        if (!student.sessionExamCourse) student.sessionExamCourse = [];
                        if (student.sessionExamCourse.length === 0) student.sessionExamCourse.push({});

                        // Update examSchema[0]
                        if (cleanUpdateData.examTag !== undefined) {
                            student.examSchema[0].examName = examTagName;
                            studentModified = true;
                        }
                        if (cleanUpdateData.class !== undefined) {
                            student.examSchema[0].class = classNameStr;
                            studentModified = true;
                        }

                        // Update sessionExamCourse[0]
                        if (cleanUpdateData.academicSession !== undefined) {
                            student.sessionExamCourse[0].session = cleanUpdateData.academicSession;
                            studentModified = true;
                        }
                        if (cleanUpdateData.examTag !== undefined) {
                            student.sessionExamCourse[0].examTag = examTagName;
                            studentModified = true;
                        }

                        student.markModified('examSchema');
                        student.markModified('sessionExamCourse');
                    }

                    // Add auditing metadata if updated
                    if (studentModified) {
                        student.updatedBy = req.user?.name || "System";
                        student.updatedByUserId = req.user?._id;
                        await student.save();
                    }
                }
            }

            // Apply updates to the current admission record
            if (Object.keys(admissionUpdates).length > 0) {
                Object.assign(admission, admissionUpdates);
                await admission.save({ validateModifiedOnly: true });
            } else if (admission.isModified()) {
                await admission.save({ validateModifiedOnly: true });
            }

            // Delete cached student reports
            if (studentId) {
                await deleteCache(`student:report:${studentId}`);
            }

            modifiedCount++;
        }

        // Invalidate admissions list caches
        await clearCachePattern("admissions:list:*");

        res.status(200).json({
            message: `Successfully updated ${modifiedCount} of ${ids.length} admissions`,
        });
    } catch (err) {
        console.error("Bulk admission update error:", err);
        res.status(500).json({ message: "Server error during bulk update", error: err.message });
    }
};
