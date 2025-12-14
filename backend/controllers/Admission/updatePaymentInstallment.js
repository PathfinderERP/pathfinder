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
        const originalAmount = installment.amount;
        const paidAmountFloat = parseFloat(paidAmount);
        
        installment.paidAmount = paidAmountFloat;
        installment.paidDate = new Date();
        installment.paymentMethod = paymentMethod;
        installment.transactionId = transactionId;
        installment.remarks = remarks;
        
        // If paid amount matches or is more (unlikely for now), mark as PAID
        // If paid amount is LESS, we still mark as PAID because the remaining moves to next
        installment.status = "PAID"; 
        
        // Handle Partial Payment Logic (Arrears)
        if (paidAmountFloat < originalAmount) {
            const remainingAmount = originalAmount - paidAmountFloat;
            console.log(`Partial payment detected. Remaining: ${remainingAmount}. Moving to next installment.`);
            
            // Find next installment
            // Assuming installments are sorted or we can find by ID/number
            const nextInstallmentIndex = admission.paymentBreakdown.findIndex(p => p.installmentNumber === (parseInt(installmentNumber) + 1));
            
            if (nextInstallmentIndex !== -1) {
                const nextInstallment = admission.paymentBreakdown[nextInstallmentIndex];
                nextInstallment.amount += remainingAmount;
                nextInstallment.remarks = (nextInstallment.remarks ? nextInstallment.remarks + "; " : "") + `Includes ₹${remainingAmount} arrears from Inst #${installmentNumber}`;
                console.log(`Updated Installment #${nextInstallment.installmentNumber}: New Amount ${nextInstallment.amount}`);
            } else {
                // If it's the last installment, we might need a different handling or create a new "Arrears" installment
                // For now, let's keep it simple or maybe fail/warn? 
                // Alternatively, we can force current status to PARTIAL if no next installment exists.
                // But user req says "add to next installment".
                console.warn("No next installment found to carry forward arrears.");
                // If no next installment, effectively it remains partial on this one?
                // But we marked it PAID above. Let's revert if last.
                installment.status = "PARTIAL"; // Or keep it unpaid
            }
        }
        
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
        // We consider it successful participation
        if (admission.centre) {
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

        // Create or update Payment record with bill details if status is PAID or PARTIAL (since we accepted money)
        // We log the payment for the amount that WAS paid.
        if (installment.paidAmount > 0) {
            // Calculate tax amounts
            const baseAmount = paidAmountFloat / 1.18;
            const cgst = baseAmount * 0.09;
            const sgst = baseAmount * 0.09;
            const courseFee = baseAmount;
            const totalAmount = paidAmountFloat;


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
