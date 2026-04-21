import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";
import Student from "../../models/Students.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import { generateBillId } from "../../utils/billIdGenerator.js";

// Helper function to revert installment amount or carry-forward adjustments
const revertPaymentVariance = async (payment, admission, isBoardAdmission = false) => {
    try {
        const variance = (payment.amount || 0) - (payment.paidAmount || 0);
        if (variance === 0) return;

        console.log(`Reverting variance for payment ${payment._id}. Variance to revert: ${variance}`);

        if (payment.isCarryForward) {
            // Revert Carry Forward Balance on Student
            const studentId = isBoardAdmission ? admission.studentId : (admission.student?._id || admission.student);
            await Student.findByIdAndUpdate(
                studentId,
                { $inc: { carryForwardBalance: -variance } }
            );
            console.log(`Reverted student carry forward balance by ${-variance}`);
        } else if (!isBoardAdmission) {
            // Revert Next Installment Adjustment (Only for Normal Admissions)
            const nextInstallmentNumber = (payment.installmentNumber || 0) + 1;
            const nextInstallment = admission.paymentBreakdown?.find(
                p => p.installmentNumber === nextInstallmentNumber
            );

            if (nextInstallment) {
                nextInstallment.amount -= variance;
                nextInstallment.remarks = (nextInstallment.remarks ? nextInstallment.remarks + "; " : "") +
                    `Reverted ₹${variance} adjustment from rejected/cancelled Inst #${payment.installmentNumber}`;
                console.log(`Reverted next installment amount for Inst #${nextInstallmentNumber}. New amount: ${nextInstallment.amount}`);
            }
        }
        // For Board Admissions, variance/adjustment is handled differently via cascading,
        // which will be triggered by saving the document after amount adjustments.
    } catch (error) {
        console.error("Error in revertPaymentVariance:", error);
    }
};

// Robust helper to populate admissions from either collection
const populateAdmissions = async (cheques) => {
    const admissionIds = [...new Set(cheques.map(c => c.admission).filter(Boolean))];
    if (admissionIds.length === 0) return cheques;

    // Try Normal Admissions
    const normalAdmissions = await Admission.find({ _id: { $in: admissionIds } })
        .populate("student")
        .populate({ path: "course", select: "courseName" })
        .populate({ path: "department", select: "departmentName" })
        .lean();

    const normalMap = new Map(normalAdmissions.map(a => [a._id.toString(), a]));

    // Identify IDs that were not found in Normal Admissions
    const remainingIds = admissionIds.filter(id => !normalMap.has(id.toString()));

    // Try Board Admissions
    let boardMap = new Map();
    if (remainingIds.length > 0) {
        const boardAdmissions = await BoardCourseAdmission.find({ _id: { $in: remainingIds } })
            .populate('boardId') // Boards model
            .lean();
        boardMap = new Map(boardAdmissions.map(a => [a._id.toString(), a]));
    }

    // Attach to cheques
    cheques.forEach(c => {
        const id = c.admission?.toString();
        if (normalMap.has(id)) {
            c.admission = normalMap.get(id);
            c.isBoardAdmission = false;
        } else if (boardMap.has(id)) {
            c.admission = boardMap.get(id);
            c.isBoardAdmission = true;
        }
    });

    return cheques;
};

// Get all pending cheques
export const getPendingCheques = async (req, res) => {
    try {
        const { centre, course, department, search, status, startDate, endDate, chequeStartDate, chequeEndDate } = req.query;

        // Build query for retrieving payments
        const query = {
            paymentMethod: "CHEQUE"
        };

        // Date filter for processing Date (updatedAt)
        if (startDate || endDate) {
            query.updatedAt = {};
            if (startDate) query.updatedAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.updatedAt.$lte = end;
            }
        }

        // Date filter for Cheque Date
        if (chequeStartDate || chequeEndDate) {
            query.chequeDate = {};
            if (chequeStartDate) query.chequeDate.$gte = new Date(chequeStartDate);
            if (chequeEndDate) {
                const end = new Date(chequeEndDate);
                end.setHours(23, 59, 59, 999);
                query.chequeDate.$lte = end;
            }
        }

        // If status specified, validate and apply
        if (status) {
            const allowedStatuses = ["PENDING_CLEARANCE", "PAID", "REJECTED", "CANCELLED"];
            const statusArray = Array.isArray(status) ? status : [status];
            const validStatusFilters = statusArray.filter(s => allowedStatuses.includes(s));
            if (validStatusFilters.length > 0) {
                query.status = { $in: validStatusFilters };
            } else {
                query.status = { $in: ["PENDING_CLEARANCE", "PAID"] };
            }
        } else {
            query.status = { $in: ["PENDING_CLEARANCE", "PAID"] };
        }

        let cheques = await Payment.find(query)
            .populate({
                path: "processedBy",
                select: "name"
            })
            .sort({ updatedAt: -1 })
            .lean();

        // Manual Population
        await populateAdmissions(cheques);

        // Filter results based on query params (since some data is in populated fields)
        if (centre || course || department || search) {
            const requestedCentres = centre ? (Array.isArray(centre) ? centre : [centre]) : [];
            const requestedCourses = course ? (Array.isArray(course) ? course : [course]) : [];
            const requestedDepts = department ? (Array.isArray(department) ? department : [department]) : [];
            const normalizedRequestedCentres = requestedCentres.map(c => (c || "").trim().toLowerCase()).filter(Boolean);

            cheques = cheques.filter(c => {
                const adm = c.admission;
                if (!adm) return false;

                let matchesCentre = true;
                if (normalizedRequestedCentres.length > 0) {
                    const admCentre = (adm.centre || "").trim().toLowerCase();
                    matchesCentre = normalizedRequestedCentres.includes(admCentre);
                }

                let matchesCourse = true;
                if (requestedCourses.length > 0) {
                    const courseName = c.isBoardAdmission ? adm.boardCourseName : adm.course?.courseName;
                    matchesCourse = requestedCourses.includes(courseName);
                }

                let matchesDept = true;
                if (requestedDepts.length > 0) {
                    const deptName = c.isBoardAdmission ? "Board" : adm.department?.departmentName;
                    matchesDept = requestedDepts.includes(deptName);
                }

                let matchesSearch = true;
                if (search) {
                    const s = search.toLowerCase();
                    const studentName = (c.isBoardAdmission ? adm.studentName : (adm.student?.studentsDetails?.[0]?.studentName || "")).toLowerCase();
                    const admNo = (adm.admissionNumber || "").toLowerCase();
                    const chNo = (c.transactionId || "").toLowerCase();
                    matchesSearch = studentName.includes(s) || admNo.includes(s) || chNo.includes(s);
                }

                return matchesCentre && matchesCourse && matchesDept && matchesSearch;
            });
        }

        const formattedCheques = cheques.map(c => {
            const adm = c.admission;
            const isBoard = c.isBoardAdmission;

            return {
                paymentId: c._id,
                admissionId: adm?._id,
                admissionNumber: adm?.admissionNumber,
                studentName: isBoard
                    ? adm?.studentName
                    : adm?.student?.studentsDetails?.[0]?.studentName,
                centre: adm?.centre,
                department: isBoard ? "Board" : adm?.department?.departmentName,
                courseName: isBoard ? adm?.boardCourseName : adm?.course?.courseName,
                installmentNumber: c.installmentNumber,
                amount: c.paidAmount,
                chequeNumber: c.transactionId,
                chequeDate: c.chequeDate,
                bankName: c.accountHolderName,
                status: c.status,
                createdAt: c.createdAt,
                processedBy: c.processedBy?.name || "System",
                clearedOrRejectedDate: c.clearedOrRejectedDate
            };
        });

        res.status(200).json(formattedCheques);
    } catch (error) {
        console.error("Get Pending Cheques Error:", error);
        res.status(500).json({ message: "Error fetching pending cheques", error: error.message });
    }
};

// Clear a cheque
export const clearCheque = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { clearedDate } = req.body;

        if (!clearedDate) {
            return res.status(400).json({ message: "Cleared Date is required to clear the cheque" });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        if (payment.status !== "PENDING_CLEARANCE") {
            return res.status(400).json({ message: "Only pending cheques can be cleared" });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        // 1. Update Payment record
        payment.status = "PAID";
        payment.paidDate = new Date();
        payment.clearedOrRejectedDate = new Date(clearedDate);
        payment.processedBy = req.user.id || req.user._id;

        // Generate Bill ID only if it doesn't already have one (from the reception stage)
        if (!payment.billId) {
            let centre = await CentreSchema.findOne({ centreName: admission.centre });
            const centreCode = centre?.enterCode || "GEN";
            payment.billId = await generateBillId(centreCode, clearedDate || new Date());
        }

        await payment.save();

        if (isBoardAdmission) {
            // 2. Update Board Admission installments
            const inst = admission.installments.find(i => i.monthNumber === payment.installmentNumber);
            if (inst) {
                // If paidAmount (already recorded) >= payableAmount, mark as PAID
                if (inst.paidAmount >= (inst.payableAmount || 0) - 0.5) {
                    inst.status = "PAID";
                }

                // Also check and update the specific transaction status if needed (though Payment doc is the source)
            }

            // 3. Recalculate Board Admission totalPaidAmount
            admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);

            // Note: Board Admissions use a different status management (ACTIVE/COMPLETED)
            if (admission.totalPaidAmount >= (admission.totalExpectedAmount || 0) - 0.5) {
                admission.status = "COMPLETED";
            }
        } else {
            // 2. Update Normal Admission paymentBreakdown or Down Payment
            if (payment.installmentNumber === 0) {
                admission.downPaymentStatus = "PAID";
            } else {
                const installment = (admission.paymentBreakdown || []).find(
                    p => p.installmentNumber === payment.installmentNumber
                );

                if (installment) {
                    installment.status = "PAID";
                    installment.paidDate = payment.paidDate;
                }
            }

            // 3. Update Normal Admission totalPaidAmount
            admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                0
            ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

            // Recalculate remaining amount
            admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

            // Update overall payment status
            if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                admission.paymentStatus = "COMPLETED";
                admission.remainingAmount = 0;
            } else {
                admission.paymentStatus = "PARTIAL";
            }

            // 4. Update Board-type Normal Admission monthly history if applicable
            if (admission.admissionType === 'BOARD' && payment.billingMonth) {
                const historyEntry = admission.monthlySubjectHistory?.find(h => h.month === payment.billingMonth);
                if (historyEntry) {
                    historyEntry.isPaid = true;
                    historyEntry.status = "PAID";
                }
            }
        }

        await admission.save();

        res.status(200).json({
            message: "Cheque cleared successfully",
            paymentId: payment._id,
            billId: payment.billId
        });
    } catch (error) {
        console.error("Clear Cheque Error:", error);
        res.status(500).json({ message: "Error clearing cheque", error: error.message });
    }
};

// Reject a cheque (Bounce)
export const rejectCheque = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason, rejectedDate } = req.body;

        if (!rejectedDate) {
            return res.status(400).json({ message: "Rejected Date is required to reject the cheque" });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        // Revert any variance adjustments made during payment recording
        await revertPaymentVariance(payment, admission, isBoardAdmission);

        // 1. Update Payment record
        payment.status = "REJECTED";
        payment.remarks = (payment.remarks ? payment.remarks + "; " : "") + `REJECTED: ${reason || 'Cheque bounced'}`;
        payment.processedBy = req.user.id || req.user._id;
        payment.clearedOrRejectedDate = new Date(rejectedDate);
        await payment.save();

        if (isBoardAdmission) {
            // 2. Update Board Admission installments
            const inst = admission.installments.find(i => i.monthNumber === payment.installmentNumber);
            if (inst) {
                // Subtract the rejected amount
                inst.paidAmount = Math.max(0, (inst.paidAmount || 0) - (payment.paidAmount || 0));

                // Reset to PENDING or OVERDUE
                const today = new Date();
                if (new Date(inst.dueDate) < today) {
                    inst.status = "PENDING"; // Often labeled as pending until cleared, or "OVERDUE" if expired
                    // Note: Board schema uses ["PENDING", "PARTIALLY_PAID", "PARTIAL", "PAID"]
                    if (inst.paidAmount > 0) inst.status = "PARTIAL";
                    else inst.status = "PENDING";
                } else {
                    if (inst.paidAmount > 0) inst.status = "PARTIAL";
                    else inst.status = "PENDING";
                }

                // Find and remove the transaction from the array if possible
                if (payment.transactionId) {
                    inst.paymentTransactions = inst.paymentTransactions.filter(t => t.transactionId !== payment.transactionId);
                }
            }

            // 3. Recalculate Board Admission totals
            // Check if it was an exam fee (some cheques might be for exam fees)
            const isExamFee = payment.remarks?.toLowerCase().includes("exam");
            if (isExamFee) {
                admission.examFeePaid = Math.max(0, (admission.examFeePaid || 0) - (payment.paidAmount || 0));
                if (admission.examFeePaid > 0) admission.examFeeStatus = "PARTIAL";
                else admission.examFeeStatus = "PENDING";
            }

            admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);

            // Re-trigger cascade if needed (handled by the controller logic usually)
            // For now, we manually recalculate the chain for board admissions to be safe
            let runningBalance = 0;
            let adjustmentApplied = false;
            for (let i = 0; i < admission.installments.length; i++) {
                const current = admission.installments[i];
                const netMonthly = (current.standardAmount || 0) - (current.waiverAmount || 0);
                const extraFees = current.monthNumber === 1 ? (Number(admission.admissionFee) || 0) : 0;

                if (current.monthNumber > 1 && !adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                    current.adjustmentAmount = -runningBalance;
                    adjustmentApplied = true;
                } else if (current.monthNumber > 1) {
                    current.adjustmentAmount = 0;
                }

                current.payableAmount = Math.max(0, netMonthly + extraFees + (current.adjustmentAmount || 0));

                if (current.paidAmount >= current.payableAmount - 0.5 && current.payableAmount > 0) {
                    current.status = "PAID";
                } else if (current.paidAmount > 0.5) {
                    current.status = "PARTIAL";
                } else {
                    current.status = "PENDING";
                }

                if (current.paidAmount > 0.5) {
                    runningBalance += (current.paidAmount - (netMonthly + extraFees));
                    adjustmentApplied = false;
                }
            }
        } else {
            // 2. Update Normal Admission paymentBreakdown or Down Payment
            const today = new Date();

            if (payment.installmentNumber === 0) {
                admission.downPaymentStatus = "REJECTED";
                admission.downPaymentTransactionId = null;
                admission.remarks = (admission.remarks ? admission.remarks + "; " : "") + `Down payment cheque rejected: ${reason}`;
            }

            // Find the primary installment for this payment
            const installment = (admission.paymentBreakdown || []).find(
                p => p.installmentNumber === payment.installmentNumber
            );

            if (installment) {
                installment.status = (new Date(installment.dueDate) < today) ? "OVERDUE" : "PENDING";
                installment.paidAmount = 0;
                installment.paymentMethod = null;
                installment.transactionId = null;
                installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Cheque rejected: ${reason}`;
            }

            // --- CASCADING REVERSION (Crucial Fix) ---
            // If this payment credited future installments (Auto-Credit), we must revert them too.
            if (payment.transactionId) {
                const searchId = payment.transactionId;
                (admission.paymentBreakdown || []).forEach(p => {
                    // Check if this installment was paid using the rejected transaction ID (even as auto-credit)
                    if (p.transactionId && p.transactionId.includes(searchId) && p.installmentNumber !== payment.installmentNumber) {
                        console.log(`Cascading Rejection: Reverting auto-paid Inst #${p.installmentNumber} linked to txn ${searchId}`);
                        p.status = (new Date(p.dueDate) < today) ? "OVERDUE" : "PENDING";
                        p.paidAmount = 0;
                        p.paymentMethod = null;
                        p.transactionId = null;
                        p.remarks = (p.remarks ? p.remarks + "; " : "") + `Reverted due to rejection of source cheque ${searchId}`;
                    }
                });
            }

            // 3. Recalculate Normal Admission totalPaidAmount
            admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                0
            ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

            // Recalculate remaining amount
            admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

            // Update payment status
            if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                admission.paymentStatus = "COMPLETED";
                admission.remainingAmount = 0;
            } else if (admission.totalPaidAmount > 0) {
                admission.paymentStatus = "PARTIAL";
            } else {
                admission.paymentStatus = "PENDING";
            }

            // 4. Update Board-type Normal Admission monthly history if applicable
            if (admission.admissionType === 'BOARD' && payment.billingMonth) {
                const historyEntry = admission.monthlySubjectHistory?.find(h => h.month === payment.billingMonth);
                if (historyEntry) {
                    historyEntry.isPaid = false;
                    historyEntry.status = "REJECTED";
                }
            }
        }

        await admission.save();

        res.status(200).json({ message: "Cheque rejected successfully" });
    } catch (error) {
        console.error("Reject Cheque Error:", error);
        res.status(500).json({ message: "Error rejecting cheque", error: error.message });
    }
};

// Get all cheques (Pending & Cleared) with filters
export const getAllCheques = async (req, res) => {
    try {
        const { centre, course, department, search, status, startDate, endDate, chequeStartDate, chequeEndDate } = req.query;

        // Build query for retrieving payments
        const query = {
            paymentMethod: "CHEQUE"
        };

        // Date filter for processing Date (updatedAt)
        if (startDate || endDate) {
            query.updatedAt = {};
            if (startDate) query.updatedAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.updatedAt.$lte = end;
            }
        }

        // Date filter for Cheque Date
        if (chequeStartDate || chequeEndDate) {
            query.chequeDate = {};
            if (chequeStartDate) query.chequeDate.$gte = new Date(chequeStartDate);
            if (chequeEndDate) {
                const end = new Date(chequeEndDate);
                end.setHours(23, 59, 59, 999);
                query.chequeDate.$lte = end;
            }
        }

        // If status specified, validate and apply
        if (status) {
            const allowedStatuses = ["PAID", "REJECTED", "CANCELLED", "PENDING_CLEARANCE"];
            const statusArray = Array.isArray(status) ? status : [status];
            const validStatusFilters = statusArray.filter(s => allowedStatuses.includes(s));
            if (validStatusFilters.length > 0) {
                query.status = { $in: validStatusFilters };
            } else {
                query.status = { $in: ["PAID", "REJECTED", "CANCELLED"] };
            }
        } else {
            query.status = { $in: ["PAID", "REJECTED", "CANCELLED"] };
        }

        let cheques = await Payment.find(query)
            .populate({
                path: "processedBy",
                select: "name"
            })
            .sort({ createdAt: -1 })
            .lean();

        // Manual Population
        await populateAdmissions(cheques);

        // Filter results based on query params (since some data is in populated fields)
        if (centre || course || department || search) {
            const requestedCentres = centre ? (Array.isArray(centre) ? centre : [centre]) : [];
            const requestedCourses = course ? (Array.isArray(course) ? course : [course]) : [];
            const requestedDepts = department ? (Array.isArray(department) ? department : [department]) : [];

            // Normalize centre names for robust matching (trim and lowercase)
            const normalizedRequestedCentres = requestedCentres.map(c => (c || "").trim().toLowerCase()).filter(Boolean);

            cheques = cheques.filter(c => {
                const adm = c.admission;
                if (!adm) return false;

                // Robust centre matching (ignoring whitespace and case)
                let matchesCentre = true;
                if (normalizedRequestedCentres.length > 0) {
                    const admCentre = (adm.centre || "").trim().toLowerCase();
                    matchesCentre = normalizedRequestedCentres.includes(admCentre);
                }

                // Course multi-select matching
                let matchesCourse = true;
                if (requestedCourses.length > 0) {
                    const courseName = c.isBoardAdmission ? adm.boardCourseName : adm.course?.courseName;
                    matchesCourse = requestedCourses.includes(courseName);
                }

                // Department multi-select matching
                let matchesDept = true;
                if (requestedDepts.length > 0) {
                    const deptName = c.isBoardAdmission ? "Board" : adm.department?.departmentName;
                    matchesDept = requestedDepts.includes(deptName);
                }

                let matchesSearch = true;
                if (search) {
                    const searchLower = search.toLowerCase();
                    const studentName = (c.isBoardAdmission ? adm.studentName : (adm.student?.studentsDetails?.[0]?.studentName || "")).toLowerCase();
                    const admissionNo = adm.admissionNumber?.toLowerCase() || "";
                    const chequeNo = c.transactionId?.toLowerCase() || "";

                    matchesSearch = studentName.includes(searchLower) ||
                        admissionNo.includes(searchLower) ||
                        chequeNo.includes(searchLower);
                }

                return matchesCentre && matchesCourse && matchesDept && matchesSearch;
            });
        }

        const formattedCheques = cheques.map(c => {
            const adm = c.admission;
            const isBoard = c.isBoardAdmission;

            return {
                id: c._id,
                paymentId: c._id,
                studentName: isBoard
                    ? adm?.studentName
                    : (adm?.student?.studentsDetails?.[0]?.studentName || "Unknown"),
                admissionNo: adm?.admissionNumber || "N/A",
                chequeNumber: c.transactionId || "N/A",
                bankName: c.accountHolderName || "N/A",
                amount: c.paidAmount,
                chequeDate: c.chequeDate,
                status: c.status === "PAID" ? "Cleared" : (c.status === "REJECTED" ? "Rejected" : (c.status === "CANCELLED" ? "Cancelled" : "Pending")),
                centre: adm?.centre || "N/A",
                course: isBoard ? adm?.boardCourseName : (adm?.course?.courseName || "N/A"),
                department: isBoard ? "Board" : (adm?.department?.departmentName || "N/A"),
                remarks: c.remarks || "N/A",
                processedBy: c.processedBy?.name || "System",
                processedDate: c.updatedAt,
                clearedOrRejectedDate: c.clearedOrRejectedDate
            };
        });

        res.status(200).json(formattedCheques);
    } catch (error) {
        console.error("Get All Cheques Error:", error);
        res.status(500).json({ message: "Error fetching cheques", error: error.message });
    }
};

// Cancel a cheque
export const cancelCheque = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason } = req.body;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        // Center Visibility Restriction
        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentreNames = currentUser ? currentUser.centres.map(c => (c.centreName || "").trim()).filter(Boolean) : [];
            const centerName = (admission.centre || "").trim();
            if (!userCentreNames.includes(centerName)) {
                return res.status(403).json({ message: "Access denied: You cannot cancel cheques for this center" });
            }
        }

        // Revert any variance adjustments made during payment recording
        await revertPaymentVariance(payment, admission, isBoardAdmission);

        // 1. Update Payment record
        payment.status = "CANCELLED";
        payment.remarks = (payment.remarks ? payment.remarks + "; " : "") + `CANCELLED: ${reason}`;
        payment.processedBy = req.user.id || req.user._id;
        await payment.save();

        if (isBoardAdmission) {
            // 2. Update Board Admission installments
            const inst = admission.installments.find(i => i.monthNumber === payment.installmentNumber);
            if (inst) {
                // Subtract the cancelled amount
                inst.paidAmount = Math.max(0, (inst.paidAmount || 0) - (payment.paidAmount || 0));

                // Reset status
                if (inst.paidAmount > 0.5) inst.status = "PARTIAL";
                else inst.status = "PENDING";

                // Remove transaction
                if (payment.transactionId) {
                    inst.paymentTransactions = inst.paymentTransactions.filter(t => t.transactionId !== payment.transactionId);
                }
            }

            // 3. Recalculate Board Admission totals
            const isExamFee = payment.remarks?.toLowerCase().includes("exam");
            if (isExamFee) {
                admission.examFeePaid = Math.max(0, (admission.examFeePaid || 0) - (payment.paidAmount || 0));
                if (admission.examFeePaid > 0) admission.examFeeStatus = "PARTIAL";
                else admission.examFeeStatus = "PENDING";
            }

            admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);

            // Recalculate cascade
            let runningBalance = 0;
            let adjustmentApplied = false;
            for (let i = 0; i < admission.installments.length; i++) {
                const current = admission.installments[i];
                const netMonthly = (current.standardAmount || 0) - (current.waiverAmount || 0);
                const extraFees = current.monthNumber === 1 ? (Number(admission.admissionFee) || 0) : 0;

                if (current.monthNumber > 1 && !adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                    current.adjustmentAmount = -runningBalance;
                    adjustmentApplied = true;
                } else if (current.monthNumber > 1) {
                    current.adjustmentAmount = 0;
                }

                current.payableAmount = Math.max(0, netMonthly + extraFees + (current.adjustmentAmount || 0));

                if (current.paidAmount >= current.payableAmount - 0.5 && current.payableAmount > 0) {
                    current.status = "PAID";
                } else if (current.paidAmount > 0.5) {
                    current.status = "PARTIAL";
                } else {
                    current.status = "PENDING";
                }

                if (current.paidAmount > 0.5) {
                    runningBalance += (current.paidAmount - (netMonthly + extraFees));
                    adjustmentApplied = false;
                }
            }
        } else {
            // 2. Update Normal Admission paymentBreakdown or Down Payment
            const today = new Date();

            if (payment.installmentNumber === 0) {
                if (admission.downPaymentStatus === "PAID" || admission.downPaymentStatus === "PENDING_CLEARANCE") {
                    admission.downPaymentStatus = "REJECTED";
                }
                admission.remarks = (admission.remarks ? admission.remarks + "; " : "") + `Down payment cheque cancelled: ${reason}`;
            }

            // Find the primary installment
            const installment = (admission.paymentBreakdown || []).find(
                p => p.installmentNumber === payment.installmentNumber
            );

            if (installment) {
                installment.status = (new Date(installment.dueDate) < today) ? "OVERDUE" : "PENDING";
                installment.paidAmount = 0;
                installment.paymentMethod = null;
                installment.transactionId = null;
                installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Cheque cancelled: ${reason}`;
            }

            // --- CASCADING REVERSION (Crucial Fix) ---
            // If this payment credited future installments (Auto-Credit), we must revert them too.
            if (payment.transactionId) {
                const searchId = payment.transactionId;
                (admission.paymentBreakdown || []).forEach(p => {
                    // Check if this installment was paid using the cancelled transaction ID (even as auto-credit)
                    if (p.transactionId && p.transactionId.includes(searchId) && p.installmentNumber !== payment.installmentNumber) {
                        console.log(`Cascading Cancellation: Reverting auto-paid Inst #${p.installmentNumber} linked to txn ${searchId}`);
                        p.status = (new Date(p.dueDate) < today) ? "OVERDUE" : "PENDING";
                        p.paidAmount = 0;
                        p.paymentMethod = null;
                        p.transactionId = null;
                        p.remarks = (p.remarks ? p.remarks + "; " : "") + `Reverted due to cancellation of source cheque ${searchId}`;
                    }
                });
            }

            // 3. Recalculate Normal Admission totalPaidAmount
            admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                0
            ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

            // Recalculate remaining amount
            admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

            // Update paymentStatus
            if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                admission.paymentStatus = "COMPLETED";
                admission.remainingAmount = 0;
            } else if (admission.totalPaidAmount > 0) {
                admission.paymentStatus = "PARTIAL";
            } else {
                admission.paymentStatus = "PENDING";
            }

            // 4. Update Board-type Normal Admission monthly history if applicable
            if (admission.admissionType === 'BOARD' && payment.billingMonth) {
                const historyEntry = admission.monthlySubjectHistory?.find(h => h.month === payment.billingMonth);
                if (historyEntry) {
                    historyEntry.isPaid = false;
                    historyEntry.status = "PENDING";
                }
            }
        }

        await admission.save();

        res.status(200).json({ message: "Cheque cancelled successfully" });
    } catch (error) {
        console.error("Cancel Cheque Error:", error);
        res.status(500).json({ message: "Error cancelling cheque", error: error.message });
    }
};
