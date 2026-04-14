import Admission from "../../models/Admission/Admission.js";
import Payment from "../../models/Payment/Payment.js";
import Student from "../../models/Students.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";

export const updatePaymentInstallment = async (req, res) => {
    try {
        const { admissionId, installmentNumber } = req.params;
        const { 
            paidAmount, 
            paymentMethod, 
            transactionId, 
            p2pRequestId, 
            remarks, 
            accountHolderName, 
            chequeDate, 
            carryForward, 
            receivedDate 
        } = req.body;

        console.log(`📡 [Payment Update] Admission: ${admissionId}, Inst: ${installmentNumber}. Method: ${paymentMethod}, TxnID: ${transactionId}, P2P: ${p2pRequestId}`);
        
        const finalTransactionId = (paymentMethod === "RAZORPAY_POS" && (!transactionId || transactionId === 'N/A' || transactionId === 'null')) 
            ? (p2pRequestId || transactionId) 
            : (transactionId || p2pRequestId);

        console.log(`✅ [Payment Update] Resolved final ID: ${finalTransactionId}`);

        const admission = await Admission.findById(admissionId).populate('student');
        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.student && admission.student.status === 'Deactivated') {
            return res.status(400).json({
                message: "This student is deactivated. Payments and other features are disabled."
            });
        }

        // Validation: Cannot pay more than the absolute remaining balance for the entire admission
        const currentRemaining = (admission.totalFees || 0) - (admission.totalPaidAmount || 0);
        const paidAmountFloat = parseFloat(paidAmount) || 0;

        if (paidAmountFloat > currentRemaining) {
            return res.status(400).json({
                message: `Payment rejected: ₹${paidAmountFloat.toLocaleString()} exceeds total course balance of ₹${currentRemaining.toLocaleString()}.`
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

        installment.paidAmount = paidAmountFloat;
        installment.paidDate = (paymentMethod === "CHEQUE") ? null : new Date();
        installment.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
        installment.paymentMethod = paymentMethod;
        installment.transactionId = finalTransactionId;
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
            let excess = Math.abs(difference);
            console.log(`Excess payment detected. Credit: ${excess}.`);

            // Fetch Centre Info early for auto-settled bill IDs
            let centreObj = await CentreSchema.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            // Sort subsequent installments by number to distribute in order
            const subsequentInstallments = admission.paymentBreakdown
                .filter(p => p.installmentNumber > parseInt(installmentNumber) && !["PAID", "COMPLETED"].includes(p.status))
                .sort((a, b) => a.installmentNumber - b.installmentNumber);

            for (const nextInst of subsequentInstallments) {
                if (excess <= 0) break;
                
                const deductFromThis = Math.min(excess, nextInst.amount);
                if (deductFromThis > 0) {
                    nextInst.amount -= deductFromThis;
                    excess -= deductFromThis;
                    
                    // Update remarks to show credit source
                    const creditNote = `Credit of ₹${deductFromThis} from Inst #${installmentNumber}`;
                    nextInst.remarks = nextInst.remarks ? `${nextInst.remarks}; ${creditNote}` : creditNote;
                    
                    // If the installment amount reaches 0, it is fully settled by this payment
                    if (nextInst.amount === 0) {
                        nextInst.status = "PAID";
                        nextInst.paidAmount = 0;
                        nextInst.paidDate = new Date();
                        nextInst.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
                        nextInst.paymentMethod = paymentMethod;
                        nextInst.transactionId = `${finalTransactionId} (Auto-Credit)`;
                        
                        // Create a reference Payment record for the auto-settled installment
                        try {
                            const billId = await generateBillId(centreCode, new Date());
                            const autoPayment = new Payment({
                                admission: admissionId,
                                installmentNumber: nextInst.installmentNumber,
                                amount: 0,
                                paidAmount: 0,
                                dueDate: nextInst.dueDate,
                                paidDate: nextInst.paidDate,
                                receivedDate: nextInst.receivedDate,
                                status: "PAID",
                                paymentMethod: paymentMethod,
                                transactionId: nextInst.transactionId,
                                accountHolderName: accountHolderName,
                                chequeDate: chequeDate,
                                remarks: `Auto-settled via surplus from Inst #${installmentNumber}`,
                                recordedBy: req.user?._id,
                                cgst: 0,
                                sgst: 0,
                                courseFee: 0,
                                totalAmount: 0,
                                isCarryForward: false,
                                billId: billId
                            });
                            await autoPayment.save();
                            console.log(`Auto-settled Inst #${nextInst.installmentNumber} with Bill ID: ${billId}`);
                        } catch (err) {
                            console.error(`Error creating auto-payment record for Inst #${nextInst.installmentNumber}:`, err);
                        }
                    }
                    
                    console.log(`Adjusted Inst #${nextInst.installmentNumber}: Deducted ₹${deductFromThis}, New Bal: ₹${nextInst.amount}, Remaining Excess: ₹${excess}`);
                }
            }

            if (excess > 0) {
                console.log(`Surplus of ₹${excess} remains after covering all future milestones.`);
            }
        }

        // Logical Edge Case: Final sweep to ensure ANY pending installment with 0 amount is auto-settled
        // This handles cases where manual adjustments or previous errors left 0-balance milestones pending.
        admission.paymentBreakdown.forEach(p => {
            if (p.status === "PENDING" && p.amount === 0) {
                p.status = "PAID";
                p.paidDate = new Date();
                p.paymentMethod = paymentMethod || "CASH";
                p.transactionId = finalTransactionId ? `${finalTransactionId} (System)` : "SYSTEM_INTERNAL";
            }
        });

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


            // Fetch Centre Info for Bill ID
            let centreObj = await CentreSchema.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            // Check if payment record already exists (exclude rejected/cancelled ones to ensure a new bill ID for new attempts)
            let payment = await Payment.findOne({
                admission: admissionId,
                installmentNumber: parseInt(installmentNumber),
                status: { $nin: ["REJECTED", "CANCELLED"] }
            });

            // Generate bill ID only if PAID (unless it's a CHEQUE which needs an ID for clearance)
            let newBillId = null;
            if (!payment || !payment.billId) {
                newBillId = await generateBillId(centreCode, new Date());
                console.log(`Generated new bill ID: ${newBillId} for transaction: ${finalTransactionId}`);
            }

            if (!payment) {
                console.log(`Creating NEW payment record for admission ${admissionId}, installment ${installmentNumber}. Method: ${paymentMethod}, TxnID: ${finalTransactionId}`);
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
                    transactionId: finalTransactionId,
                    accountHolderName: accountHolderName, // New
                    chequeDate: chequeDate, // New
                    remarks: remarks,
                    recordedBy: req.user?._id,
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    courseFee: parseFloat(courseFee.toFixed(2)),
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    isCarryForward: carryForward || false,
                    billId: newBillId
                });
                await payment.save();
            } else {
                console.log(`Updating EXISTING payment record ${payment._id}. Method: ${paymentMethod}, TxnID: ${finalTransactionId}`);
                // Update existing payment record
                payment.paidAmount = paidAmount;
                payment.paidDate = installment.paidDate;
                payment.receivedDate = installment.receivedDate;
                payment.status = installment.status;
                payment.paymentMethod = paymentMethod;
                payment.transactionId = finalTransactionId;
                payment.accountHolderName = accountHolderName; // New
                payment.chequeDate = chequeDate; // New
                payment.remarks = remarks;
                payment.cgst = parseFloat(cgst.toFixed(2));
                payment.sgst = parseFloat(sgst.toFixed(2));
                payment.courseFee = parseFloat(courseFee.toFixed(2));
                payment.totalAmount = parseFloat(totalAmount.toFixed(2));
                payment.isCarryForward = carryForward || false;
                
                // CRUCIAL: Also update bill ID if we generated a new one
                if (newBillId) {
                    payment.billId = newBillId;
                }
                
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
