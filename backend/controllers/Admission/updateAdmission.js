import Admission from "../../models/Admission/Admission.js";
import { clearCachePattern, deleteCache } from "../../utils/redisCache.js";

export const updateAdmission = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Fetch the current admission to get student ID
        const currentAdmission = await Admission.findById(id);
        if (!currentAdmission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        const studentId = currentAdmission.student;

        // If admissionNumber is being updated, perform synchronization and conflict checks
        if (updates.admissionNumber) {
            const trimmedNumber = updates.admissionNumber.trim().toUpperCase();
            updates.admissionNumber = trimmedNumber;

            // Check for duplicates among OTHER students
            const existingForOtherStudent = await Admission.findOne({
                admissionNumber: trimmedNumber,
                student: { $ne: studentId }
            });

            if (existingForOtherStudent) {
                return res.status(409).json({
                    message: `Enrollment number "${trimmedNumber}" is already assigned to another student.`
                });
            }

            // Synchronize across ALL admissions for this student
            await Admission.updateMany(
                { student: studentId },
                { admissionNumber: trimmedNumber }
            );
        }

        // Synchronize centre across ALL admissions for this student if it's being updated
        if (updates.centre) {
            await Admission.updateMany(
                { student: studentId },
                { centre: updates.centre }
            );
        }

        const admission = await Admission.findByIdAndUpdate(
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

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.student && admission.student.status === 'Deactivated') {
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
