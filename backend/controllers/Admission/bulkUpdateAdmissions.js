import Admission from "../../models/Admission/Admission.js";
import Student from "../../models/Students.js";
<<<<<<< HEAD
import ExamTag from "../../models/Master_data/ExamTag.js";
import Class from "../../models/Master_data/Class.js";
=======
>>>>>>> fa4e211a9ad501525c8633f4da4526ee626d5fe4
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
        const optionalFields = ['class', 'examTag', 'department', 'course'];
        optionalFields.forEach(field => {
            if (cleanUpdateData[field] === "") {
                cleanUpdateData[field] = null;
            }
        });

<<<<<<< HEAD
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

=======
>>>>>>> fa4e211a9ad501525c8633f4da4526ee626d5fe4
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

            // Sync Centre across all admissions of the student and on the student record
            if (cleanUpdateData.centre !== undefined) {
                admissionUpdates.centre = cleanUpdateData.centre;

                // Sync to all admissions for this student
                if (studentId) {
                    await Admission.updateMany(
                        { student: studentId },
                        { centre: cleanUpdateData.centre }
                    );
<<<<<<< HEAD
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
=======

                    // Sync to Student profile details
                    const student = await Student.findById(studentId);
                    if (student && student.studentsDetails && student.studentsDetails[0]) {
                        student.studentsDetails[0].centre = cleanUpdateData.centre;
                        student.markModified('studentsDetails');
>>>>>>> fa4e211a9ad501525c8633f4da4526ee626d5fe4
                        await student.save();
                    }
                }
            }

<<<<<<< HEAD
=======
            // Sync Counselled By to the student record
            if (cleanUpdateData.counselledBy !== undefined && studentId) {
                await Student.findByIdAndUpdate(studentId, {
                    counselledBy: cleanUpdateData.counselledBy
                });
            }

>>>>>>> fa4e211a9ad501525c8633f4da4526ee626d5fe4
            // Apply updates to the current admission record
            if (Object.keys(admissionUpdates).length > 0) {
                await Admission.findByIdAndUpdate(admissionId, admissionUpdates, { runValidators: true });
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
