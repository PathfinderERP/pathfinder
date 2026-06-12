import Admission from "../../models/Admission/Admission.js";
import Student from "../../models/Students.js";
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

                    // Sync to Student profile details
                    const student = await Student.findById(studentId);
                    if (student && student.studentsDetails && student.studentsDetails[0]) {
                        student.studentsDetails[0].centre = cleanUpdateData.centre;
                        student.markModified('studentsDetails');
                        await student.save();
                    }
                }
            }

            // Sync Counselled By to the student record
            if (cleanUpdateData.counselledBy !== undefined && studentId) {
                await Student.findByIdAndUpdate(studentId, {
                    counselledBy: cleanUpdateData.counselledBy
                });
            }

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
