import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";

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

        // If reactivating, shift installments if deactivationDate exists
        if (status === 'Active') {
            let daysDeactivated = 0;
            if (oldStatus === 'Deactivated' && deactivationDate) {
                const now = new Date();
                daysDeactivated = Math.floor((now - new Date(deactivationDate)) / (1000 * 60 * 60 * 24));
            }

            // Fetch Normal Admissions and Board Admissions in parallel
            const [admissions, boardAdmissions] = await Promise.all([
                Admission.find({ student: studentId }),
                BoardCourseAdmission.find({ studentId: studentId })
            ]);

            const updatePromises = [];

            // Update Normal Admissions
            for (const admission of admissions) {
                let updatedBreakdown = admission.paymentBreakdown || [];
                if (daysDeactivated > 0 && Array.isArray(updatedBreakdown)) {
                    const now = new Date();
                    updatedBreakdown = updatedBreakdown.map(inst => {
                        const instObj = inst.toObject ? inst.toObject() : { ...inst };
                        if ((instObj.status === 'PENDING' || instObj.status === 'OVERDUE') && instObj.dueDate) {
                            const oldDueDate = new Date(instObj.dueDate);
                            if (!isNaN(oldDueDate.getTime())) {
                                oldDueDate.setDate(oldDueDate.getDate() + daysDeactivated);
                                instObj.dueDate = oldDueDate;
                                if (instObj.status === 'OVERDUE' && oldDueDate > now) {
                                    instObj.status = 'PENDING';
                                }
                            }
                        }
                        return instObj;
                    });
                }
                updatePromises.push(
                    Admission.updateOne(
                        { _id: admission._id },
                        {
                            $set: {
                                admissionStatus: 'ACTIVE',
                                paymentBreakdown: updatedBreakdown
                            }
                        }
                    )
                );
            }

            // Update Board Admissions
            for (const bAdmission of boardAdmissions) {
                let updatedInstallments = bAdmission.installments || [];
                if (daysDeactivated > 0 && Array.isArray(updatedInstallments)) {
                    updatedInstallments = updatedInstallments.map(inst => {
                        const instObj = inst.toObject ? inst.toObject() : { ...inst };
                        if (['PENDING', 'PARTIAL', 'PARTIALLY_PAID', 'OVERDUE'].includes(instObj.status) && instObj.dueDate) {
                            const oldDueDate = new Date(instObj.dueDate);
                            if (!isNaN(oldDueDate.getTime())) {
                                oldDueDate.setDate(oldDueDate.getDate() + daysDeactivated);
                                instObj.dueDate = oldDueDate;
                            }
                        }
                        return instObj;
                    });
                }
                updatePromises.push(
                    BoardCourseAdmission.updateOne(
                        { _id: bAdmission._id },
                        {
                            $set: {
                                status: 'ACTIVE',
                                installments: updatedInstallments
                            }
                        }
                    )
                );
            }

            await Promise.all(updatePromises);

            // Update student status with findByIdAndUpdate to avoid schema validation errors on unrelated fields
            const updatedStudent = await Student.findByIdAndUpdate(
                studentId,
                {
                    $set: {
                        status: 'Active',
                        deactivationDate: null,
                        deactivatedBy: null,
                        deactivatedByUserId: null
                    }
                },
                { new: true }
            );

            return res.status(200).json({
                message: "Student successfully reactivated",
                student: updatedStudent
            });

        } else if (status === 'Deactivated') {
            const deactivationDate = new Date();
            const deactivatedBy = req.user?.name || 'System';
            const deactivatedByUserId = req.user?._id || req.user?.id || null;

            await Promise.all([
                Admission.updateMany(
                    { student: studentId },
                    { $set: { admissionStatus: 'INACTIVE' } }
                ),
                BoardCourseAdmission.updateMany(
                    { studentId: studentId },
                    { $set: { status: 'INACTIVE' } }
                )
            ]);

            const updatedStudent = await Student.findByIdAndUpdate(
                studentId,
                {
                    $set: {
                        status: 'Deactivated',
                        deactivationDate,
                        deactivatedBy,
                        deactivatedByUserId
                    }
                },
                { new: true }
            );

            return res.status(200).json({
                message: "Student successfully deactivated",
                student: updatedStudent
            });
        }

    } catch (err) {
        console.error("Toggle Student Status Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
