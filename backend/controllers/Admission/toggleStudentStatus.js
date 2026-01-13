import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";

/**
 * Toggle student status between 'Active' and 'Deactivated'
 * Also updates all associated admissions to match the status
 * and shifts installment dates when reactivating
 */
export const toggleStudentStatus = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { status } = req.body;

        if (!['Active', 'Deactivated'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const oldStatus = student.status;
        const deactivationDate = student.deactivationDate;

        // If reactivating and we have a deactivation date, shift installments
        if (status === 'Active' && oldStatus === 'Deactivated' && deactivationDate) {
            const now = new Date();
            const daysDeactivated = Math.floor((now - new Date(deactivationDate)) / (1000 * 60 * 60 * 24));

            if (daysDeactivated > 0) {
                const admissions = await Admission.find({ student: studentId });
                for (const admission of admissions) {
                    let changed = false;
                    admission.paymentBreakdown.forEach(inst => {
                        // Only shift future or currently due installments
                        if (inst.status === 'PENDING' || inst.status === 'OVERDUE') {
                            const oldDueDate = new Date(inst.dueDate);
                            oldDueDate.setDate(oldDueDate.getDate() + daysDeactivated);
                            inst.dueDate = oldDueDate;

                            // Re-calculate status if it was overdue but now shifted to future
                            if (inst.status === 'OVERDUE' && oldDueDate > now) {
                                inst.status = 'PENDING';
                            }

                            changed = true;
                        }
                    });

                    // ALWAYS set admissionStatus back to ACTIVE when student is reactivated
                    admission.admissionStatus = 'ACTIVE';
                    await admission.save();
                }
            } else {
                // Even if 0 days, ensure admissions are set to ACTIVE
                await Admission.updateMany(
                    { student: studentId },
                    { admissionStatus: 'ACTIVE' }
                );
            }
            student.deactivationDate = null;
        } else if (status === 'Deactivated') {
            student.deactivationDate = new Date();

            // Set all admissions to INACTIVE
            await Admission.updateMany(
                { student: studentId },
                { admissionStatus: 'INACTIVE' }
            );
        }

        student.status = status;
        await student.save();

        res.status(200).json({
            message: `Student successfully ${status === 'Active' ? 'reactivated' : 'deactivated'}`,
            student
        });
    } catch (err) {
        console.error("Toggle Student Status Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
