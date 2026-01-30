import Admission from "../../models/Admission/Admission.js";
import Payment from "../../models/Payment/Payment.js";
import Student from "../../models/Students.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";

export const updatePaymentInstallment = async (req, res) => {
    try {
        const { admissionId, installmentNumber } = req.params;
        const { paidAmount, paymentMethod, transactionId, remarks, accountHolderName, chequeDate, carryForward, receivedDate } = req.body;

        const admission = await Admission.findById(admissionId).populate('student');
        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.student && admission.student.status === 'Deactivated') {
            return res.status(400).json({
                message: "This student is deactivated. Payments and other features are disabled."
            });
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
        installment.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
        installment.paymentMethod = paymentMethod;
        installment.transactionId = transactionId;
        installment.accountHolderName = accountHolderName; // New
        installment.chequeDate = chequeDate; // New
        installment.remarks = remarks;

        // Check if this is the last installment
        const isLastInstallment = admission.paymentBreakdown.every(p => p.installmentNumber <= installment.installmentNumber);
        const nextInstallmentIndex = admission.paymentBreakdown.findIndex(p => p.installmentNumber === (parseInt(installmentNumber) + 1));
        const hasNextInstallment = nextInstallmentIndex !== -1;

        if ((isLastInstallment || !hasNextInstallment) && !carryForward) {
            // Strict check for last installment ONLY if NOT carrying forward
            if (paidAmountFloat < originalAmount) {
                return res.status(400).json({
                    message: "Final installment must be paid in full unless carrying forward."
                });
            }
        }

        installment.status = (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID";

        // Logic: Arrears OR Excess
        const difference = originalAmount - paidAmountFloat; // Positive = Arrears, Negative = Excess

        if (difference > 0) {
            // Partial Payment (Underpayment)
            console.log(`Partial payment detected. Arrears: ${difference}.`);

            if (carryForward) {
                // Add to Student's Carry Forward Balance
                try {
                    const studentId = admission.student._id || admission.student;
                    const updatedStudent = await Student.findByIdAndUpdate(
                        studentId,
                        {
                            $inc: { carryForwardBalance: difference },
                            $set: { markedForCarryForward: true }
                        },
                        { new: true, runValidators: false }
                    );

                    if (updatedStudent) {
                        installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Carried Forward Arrears: ₹${difference}`;
                        console.log(`Updated Student ${updatedStudent._id}: Carry Forward Balance increased by ₹${difference}`);
                    } else {
                        console.error(`Student not found with ID: ${studentId}`);
                    }
                } catch (error) {
                    console.error(`Error updating student carry forward balance:`, error);
                    throw new Error(`Failed to update carry forward balance: ${error.message}`);
                }
            } else if (hasNextInstallment) {
                const nextInstallment = admission.paymentBreakdown[nextInstallmentIndex];
                nextInstallment.amount += difference;
                nextInstallment.remarks = (nextInstallment.remarks ? nextInstallment.remarks + "; " : "") + `Includes ₹${difference} arrears from Inst #${installmentNumber}`;
                console.log(`Updated Next Inst #${nextInstallment.installmentNumber}: Increased to ₹${nextInstallment.amount}`);
            } else {
                console.warn("Partial payment on last installment accepted (validation skipped?).");
            }
        } else if (difference < 0) {
            // Excess Payment (Overpayment)
            const excess = Math.abs(difference);
            console.log(`Excess payment detected. Credit: ${excess}.`);

            if (hasNextInstallment) {
                const nextInstallment = admission.paymentBreakdown[nextInstallmentIndex];
                // Reduce next installment amount
                // Ensure next amount doesn't go negative? Or allow it (credit flows further)?
                // For simplicity, just subtract. if next becomes negative, logic handles it next time?
                // Ideally, keep amount >= 0. But if credit > next, next is 0 and we have more credit?
                // Let's just subtract for now.
                nextInstallment.amount -= excess;
                nextInstallment.remarks = (nextInstallment.remarks ? nextInstallment.remarks + "; " : "") + `Credit of ₹${excess} from Inst #${installmentNumber}`;
                console.log(`Updated Next Inst #${nextInstallment.installmentNumber}: Reduced to ₹${nextInstallment.amount}`);
            } else {
                // Last installment overpayment
                // Just accept it. Pending amount will be 0 (clamped in frontend) or negative (if we want to show surplus).
                // User complained about "value in minus" in Pending. 
                // We'll fix frontend to clamp pending at 0.
            }
        }

        // Update total paid amount
        admission.totalPaidAmount = admission.paymentBreakdown.reduce(
            (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
            0
        ) + admission.downPayment;

        // Recalculate remaining amount
        admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

        // Update payment status
        if (admission.totalPaidAmount >= admission.totalFees) {
            admission.paymentStatus = "COMPLETED";
            admission.remainingAmount = 0; // Ensure it's exactly 0 when completed
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
                    receivedDate: installment.receivedDate,
                    status: installment.status,
                    paymentMethod: paymentMethod,
                    transactionId: transactionId,
                    accountHolderName: accountHolderName, // New
                    chequeDate: chequeDate, // New
                    remarks: remarks,
                    recordedBy: req.user?._id,
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    courseFee: parseFloat(courseFee.toFixed(2)),
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    isCarryForward: carryForward || false
                });
                await payment.save();
            } else {
                // Update existing payment record
                payment.paidAmount = paidAmount;
                payment.paidDate = installment.paidDate;
                payment.receivedDate = installment.receivedDate;
                payment.status = installment.status;
                payment.paymentMethod = paymentMethod;
                payment.transactionId = transactionId;
                payment.accountHolderName = accountHolderName; // New
                payment.chequeDate = chequeDate; // New
                payment.remarks = remarks;
                payment.cgst = parseFloat(cgst.toFixed(2));
                payment.sgst = parseFloat(sgst.toFixed(2));
                payment.courseFee = parseFloat(courseFee.toFixed(2));
                payment.totalAmount = parseFloat(totalAmount.toFixed(2));
                payment.isCarryForward = carryForward || false;
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
