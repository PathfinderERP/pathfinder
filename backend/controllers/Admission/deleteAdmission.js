import Admission from "../../models/Admission/Admission.js";
import Student from "../../models/Students.js";
import { deleteCache } from "../../utils/redisCache.js";
import { getActiveCarryForwardBalance } from "../../utils/carryForwardHelper.js";

export const deleteAdmission = async (req, res) => {
    try {
        const { id } = req.params;

        const admission = await Admission.findById(id);

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        // Set status to INACTIVE
        admission.admissionStatus = "INACTIVE";

        // Deactivate upcoming installments
        if (admission.paymentBreakdown) {
            admission.paymentBreakdown.forEach(inst => {
                if (inst.status !== "PAID" && inst.status !== "COMPLETED") {
                    inst.status = "DEACTIVATED";
                }
            });
        }

        // Deactivate board monthly subject history if applicable
        if (admission.monthlySubjectHistory) {
            admission.monthlySubjectHistory.forEach(hist => {
                if (!hist.isPaid && hist.status !== "PAID" && hist.status !== "COMPLETED") {
                    hist.status = "DEACTIVATED";
                }
            });
        }

        // Update financial amounts so they don't reflect in remaining balances
        // (Requested by user to NOT zero out the pending fees when deactivated, so UI shows correct total fees)
        // admission.remainingAmount = 0;
        // admission.totalFees = admission.totalPaidAmount || 0;

        await admission.save();

        // Update student's carry forward balance so deactivated course's remaining balance is not carried forward
        if (admission.student) {
            await getActiveCarryForwardBalance(admission.student);
            await deleteCache(`student:report:${admission.student}`);
        }

        res.status(200).json({ message: "Admission deactivated successfully", admission });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const reactivateAdmission = async (req, res) => {
    try {
        const { id } = req.params;

        const admission = await Admission.findById(id);

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.admissionStatus !== "INACTIVE") {
            return res.status(400).json({ message: "Admission is already active" });
        }

        // 1. Find deactivated installments and restore them to PENDING
        let restoredRemainingAmount = 0;
        if (admission.paymentBreakdown) {
            admission.paymentBreakdown.forEach(inst => {
                if (inst.status === "DEACTIVATED") {
                    inst.status = "PENDING";
                    restoredRemainingAmount += inst.amount || 0;
                }
            });
        }

        // 2. Restore monthlySubjectHistory status to PENDING
        if (admission.monthlySubjectHistory) {
            admission.monthlySubjectHistory.forEach(hist => {
                if (hist.status === "DEACTIVATED") {
                    hist.status = "PENDING";
                }
            });
        }

        // 3. Recalculate financial fields (Not needed anymore since we don't wipe them on deactivate)
        // admission.remainingAmount = parseFloat(restoredRemainingAmount.toFixed(3));
        // admission.totalFees = parseFloat(((admission.totalPaidAmount || 0) + restoredRemainingAmount).toFixed(3));
        
        // Set status to ACTIVE
        admission.admissionStatus = "ACTIVE";

        await admission.save();

        // If this admission had carried forward arrears, restore them to student
        if (admission.student) {
            let restoredCf = 0;
            (admission.paymentBreakdown || []).forEach(inst => {
                if (inst.remarks) {
                    const match = inst.remarks.match(/Carried Forward Arrears:\s*₹?\s*([0-9.]+)/i);
                    if (match && match[1]) {
                        restoredCf += parseFloat(match[1]);
                    }
                }
            });
            if (restoredCf > 0) {
                await Student.findByIdAndUpdate(admission.student, {
                    $inc: { carryForwardBalance: restoredCf },
                    $set: { markedForCarryForward: true }
                });
            }
            await deleteCache(`student:report:${admission.student}`);
        }

        res.status(200).json({ message: "Admission reactivated successfully", admission });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
