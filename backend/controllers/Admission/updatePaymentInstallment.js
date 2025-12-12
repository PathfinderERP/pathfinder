import Admission from "../../models/Admission/Admission.js";
import Payment from "../../models/Payment/Payment.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";

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

        // Update Centre Target Achieved if payment was successful
        if (installment.status === "PAID" && admission.centre) {
            await updateCentreTargetAchieved(admission.centre, installment.paidDate || new Date());
        }

        // Check for overdue installments
        const today = new Date();
        admission.paymentBreakdown.forEach(p => {
            if (p.status === "PENDING" && new Date(p.dueDate) < today) {
                p.status = "OVERDUE";
            }
        });

        await admission.save();

        // Create or update Payment record with bill details if status is PAID
        if (installment.status === "PAID") {
            // Calculate tax amounts (CGST and SGST are typically 9% each = 18% total)
            // paidAmount is inclusive of 18% GST
            const baseAmount = paidAmount / 1.18;
            const cgst = baseAmount * 0.09;
            const sgst = baseAmount * 0.09;
            const courseFee = baseAmount;
            const totalAmount = paidAmount;

            // Check if payment record already exists
            let payment = await Payment.findOne({
                admission: admissionId,
                installmentNumber: parseInt(installmentNumber)
            });

            if (!payment) {
                // Create new payment record
                payment = new Payment({
                    admission: admissionId,
                    installmentNumber: parseInt(installmentNumber),
                    amount: installment.amount,
                    paidAmount: paidAmount,
                    dueDate: installment.dueDate,
                    paidDate: installment.paidDate,
                    status: installment.status,
                    paymentMethod: paymentMethod,
                    transactionId: transactionId,
                    remarks: remarks,
                    recordedBy: req.user?.id,
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    courseFee: parseFloat(courseFee.toFixed(2)),
                    totalAmount: parseFloat(totalAmount.toFixed(2))
                });
                await payment.save();
            } else {
                // Update existing payment record
                payment.paidAmount = paidAmount;
                payment.paidDate = installment.paidDate;
                payment.status = installment.status;
                payment.paymentMethod = paymentMethod;
                payment.transactionId = transactionId;
                payment.remarks = remarks;
                payment.cgst = parseFloat(cgst.toFixed(2));
                payment.sgst = parseFloat(sgst.toFixed(2));
                payment.courseFee = parseFloat(courseFee.toFixed(2));
                payment.totalAmount = parseFloat(totalAmount.toFixed(2));
                await payment.save();
            }
        }

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
