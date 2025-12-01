import Admission from "../../models/Admission/Admission.js";

export const updatePaymentInstallment = async (req, res) => {
    try {
        const { admissionId, installmentNumber } = req.params;
        const { paidAmount, paymentMethod, transactionId, remarks } = req.body;

        const admission = await Admission.findById(admissionId);
        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        // Find the installment
        const installment = admission.paymentBreakdown.find(
            p => p.installmentNumber === parseInt(installmentNumber)
        );

        if (!installment) {
            return res.status(404).json({ message: "Installment not found" });
        }

        // Update installment
        installment.paidAmount = paidAmount;
        installment.paidDate = new Date();
        installment.paymentMethod = paymentMethod;
        installment.transactionId = transactionId;
        installment.remarks = remarks;
        installment.status = paidAmount >= installment.amount ? "PAID" : "PENDING";

        // Update total paid amount
        admission.totalPaidAmount = admission.paymentBreakdown.reduce(
            (sum, p) => sum + (p.paidAmount || 0), 
            0
        ) + admission.downPayment;

        // Update payment status
        if (admission.totalPaidAmount >= admission.totalFees) {
            admission.paymentStatus = "COMPLETED";
        } else if (admission.totalPaidAmount > 0) {
            admission.paymentStatus = "PARTIAL";
        }

        // Check for overdue installments
        const today = new Date();
        admission.paymentBreakdown.forEach(p => {
            if (p.status === "PENDING" && new Date(p.dueDate) < today) {
                p.status = "OVERDUE";
            }
        });

        await admission.save();

        const updatedAdmission = await Admission.findById(admissionId)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department');

        res.status(200).json({
            message: "Payment updated successfully",
            admission: updatedAdmission
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
