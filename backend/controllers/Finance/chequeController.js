import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";
import Student from "../../models/Students.js";

// Helper function to revert installment amount or carry-forward adjustments
const revertPaymentVariance = async (payment, admission) => {
    try {
        const variance = (payment.amount || 0) - (payment.paidAmount || 0);
        if (variance === 0) return;

        console.log(`Reverting variance for payment ${payment._id}. Variance to revert: ${variance}`);

        if (payment.isCarryForward) {
            // Revert Carry Forward Balance on Student
            const studentId = admission.student._id || admission.student;
            await Student.findByIdAndUpdate(
                studentId,
                { $inc: { carryForwardBalance: -variance } }
            );
            console.log(`Reverted student carry forward balance by ${-variance}`);
        } else {
            // Revert Next Installment Adjustment
            const nextInstallmentNumber = (payment.installmentNumber || 0) + 1;
            const nextInstallment = admission.paymentBreakdown.find(
                p => p.installmentNumber === nextInstallmentNumber
            );

            if (nextInstallment) {
                nextInstallment.amount -= variance;
                nextInstallment.remarks = (nextInstallment.remarks ? nextInstallment.remarks + "; " : "") +
                    `Reverted ₹${variance} adjustment from rejected/cancelled Inst #${payment.installmentNumber}`;
                console.log(`Reverted next installment amount for Inst #${nextInstallmentNumber}. New amount: ${nextInstallment.amount}`);
            }
        }
    } catch (error) {
        console.error("Error in revertPaymentVariance:", error);
        // We don't throw here to avoid blocking the main rejection flow, but it's logged.
    }
};

// Generate a unique sequential bill ID (same logic as generateBill.js)
const generateBillId = async (centreCode) => {
    try {
        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();

        let startYear, endYear;
        if (month >= 3) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }

        const yearStr = `${startYear}-${endYear.toString().slice(-2)}`;
        const prefix = `PATH/${centreCode}/${yearStr}/`;

        const lastPayment = await Payment.findOne({
            billId: { $regex: new RegExp(`^${prefix.replace(/\//g, '\\/')}\\d+$`) }
        }).sort({ createdAt: -1 });

        let nextNumber = 1;
        if (lastPayment && lastPayment.billId) {
            const parts = lastPayment.billId.split('/');
            const lastSeq = parts[parts.length - 1];
            if (lastSeq && !isNaN(lastSeq)) {
                nextNumber = parseInt(lastSeq) + 1;
            }
        }

        return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
        console.error("Bill ID Gen Error:", error);
        return `PATH/${centreCode || 'GEN'}/${Date.now()}`;
    }
};

// Get all pending cheques
export const getPendingCheques = async (req, res) => {
    try {
        const cheques = await Payment.find({
            paymentMethod: "CHEQUE",
            status: "PENDING_CLEARANCE"
        })
            .populate({
                path: "admission",
                populate: [
                    { path: "student" },
                    { path: "course", select: "courseName" }
                ]
            })
            .sort({ createdAt: -1 });

        // Center Visibility Restriction
        let filteredCheques = cheques;
        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentreNames = currentUser ? currentUser.centres.map(c => (c.centreName || "").trim()).filter(Boolean) : [];
            filteredCheques = cheques.filter(c => {
                const centerName = (c.admission?.centre || "").trim();
                return userCentreNames.includes(centerName);
            });
        }

        const formattedCheques = filteredCheques.map(c => ({
            paymentId: c._id,
            admissionId: c.admission?._id,
            admissionNumber: c.admission?.admissionNumber,
            studentName: c.admission?.student?.studentsDetails?.[0]?.studentName,
            centre: c.admission?.centre,
            courseName: c.admission?.course?.courseName,
            installmentNumber: c.installmentNumber,
            amount: c.paidAmount,
            chequeNumber: c.transactionId,
            chequeDate: c.chequeDate,
            bankName: c.accountHolderName,
            status: c.status,
            createdAt: c.createdAt
        }));

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

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        if (payment.status !== "PENDING_CLEARANCE") {
            return res.status(400).json({ message: "Only pending cheques can be cleared" });
        }

        const admission = await Admission.findById(payment.admission);
        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        // 1. Update Payment record
        payment.status = "PAID";
        payment.paidDate = new Date();

        // Generate Bill ID
        let centre = await CentreSchema.findOne({ centreName: admission.centre });
        const centreCode = centre?.enterCode || "GEN";
        payment.billId = await generateBillId(centreCode);

        await payment.save();

        // 2. Update Admission paymentBreakdown or Down Payment
        if (payment.installmentNumber === 0) {
            admission.downPaymentStatus = "PAID";
        } else {
            const installment = admission.paymentBreakdown.find(
                p => p.installmentNumber === payment.installmentNumber
            );

            if (installment) {
                installment.status = "PAID";
                installment.paidDate = payment.paidDate;
            }
        }

        // 3. Update Admission totalPaidAmount
        admission.totalPaidAmount = admission.paymentBreakdown.reduce(
            (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
            0
        ) + (admission.downPaymentStatus === "PAID" ? admission.downPayment : 0);

        // Recalculate remaining amount
        admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

        // Update overall payment status
        if (admission.totalPaidAmount >= admission.totalFees) {
            admission.paymentStatus = "COMPLETED";
            admission.remainingAmount = 0; // Ensure it's exactly 0 when completed
        } else {
            admission.paymentStatus = "PARTIAL";
        }

        // 4. Update Board Course monthly history if applicable
        if (admission.admissionType === 'BOARD' && payment.billingMonth) {
            const historyEntry = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
            if (historyEntry) {
                historyEntry.isPaid = true;
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
        const { reason } = req.body;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        const admission = await Admission.findById(payment.admission);
        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        // Revert any variance adjustments made during payment recording
        await revertPaymentVariance(payment, admission);

        // 1. Update Payment record
        payment.status = "REJECTED";
        payment.remarks = (payment.remarks ? payment.remarks + "; " : "") + `REJECTED: ${reason || 'Cheque bounced'}`;
        await payment.save();

        // 2. Update Admission paymentBreakdown or Down Payment
        if (payment.installmentNumber === 0) {
            admission.downPaymentStatus = "REJECTED";
            admission.downPaymentTransactionId = null;
            admission.remarks = (admission.remarks ? admission.remarks + "; " : "") + `Down payment cheque rejected: ${reason}`;
        } else {
            const installment = admission.paymentBreakdown.find(
                p => p.installmentNumber === payment.installmentNumber
            );

            if (installment) {
                // Reset to OVERDUE or PENDING depending on date
                const today = new Date();
                if (new Date(installment.dueDate) < today) {
                    installment.status = "OVERDUE";
                } else {
                    installment.status = "PENDING";
                }
                installment.paidAmount = 0;
                installment.paymentMethod = null;
                installment.transactionId = null;
                installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Cheque rejected: ${reason}`;
            }
        }

        // 3. Recalculate totalPaidAmount
        admission.totalPaidAmount = admission.paymentBreakdown.reduce(
            (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
            0
        ) + (admission.downPaymentStatus === "PAID" ? admission.downPayment : 0);

        // Recalculate remaining amount
        admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

        // Update payment status
        if (admission.totalPaidAmount >= admission.totalFees) {
            admission.paymentStatus = "COMPLETED";
            admission.remainingAmount = 0;
        } else if (admission.totalPaidAmount > 0) {
            admission.paymentStatus = "PARTIAL";
        } else {
            admission.paymentStatus = "PENDING";
        }

        // 4. Update Board Course monthly history if applicable
        if (admission.admissionType === 'BOARD' && payment.billingMonth) {
            const historyEntry = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
            if (historyEntry) {
                historyEntry.isPaid = false;
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
        const { centre, course, department, search } = req.query;

        // Build query for retrieving payments
        const query = {
            paymentMethod: "CHEQUE",
            status: { $in: ["PENDING_CLEARANCE", "PAID", "REJECTED", "CANCELLED"] }
        };

        let cheques = await Payment.find(query)
            .populate({
                path: "admission",
                populate: [
                    { path: "student" },
                    { path: "course", select: "courseName" },
                    { path: "department", select: "departmentName" } // Ensure retrieval of department name
                ]
            })
            .sort({ createdAt: -1 });

        // Filter results based on query params (since some data is in populated fields)
        if (centre || course || department || search) {
            cheques = cheques.filter(c => {
                const adm = c.admission;
                if (!adm) return false;

                const matchesCentre = !centre || adm.centre === centre;
                const matchesCourse = !course || adm.course?.courseName === course;
                // Note: Department might be an ObjectId or populated object depending on schema. 
                // Assuming populated based on getAllCheques population logic above.
                const matchesDept = !department || adm.department?.departmentName === department;

                let matchesSearch = true;
                if (search) {
                    const searchLower = search.toLowerCase();
                    const studentName = adm.student?.studentsDetails?.[0]?.studentName?.toLowerCase() || "";
                    const admissionNo = adm.admissionNumber?.toLowerCase() || "";
                    const chequeNo = c.transactionId?.toLowerCase() || "";

                    matchesSearch = studentName.includes(searchLower) ||
                        admissionNo.includes(searchLower) ||
                        chequeNo.includes(searchLower);
                }

                return matchesCentre && matchesCourse && matchesDept && matchesSearch;
            });
        }

        // Center Visibility Restriction (Enforce if not SuperAdmin)
        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentreNames = currentUser ? currentUser.centres.map(c => (c.centreName || "").trim()).filter(Boolean) : [];
            cheques = cheques.filter(c => {
                const centerName = (c.admission?.centre || "").trim();
                return userCentreNames.includes(centerName);
            });
        }

        const formattedCheques = cheques.map(c => ({
            id: c._id,
            paymentId: c._id,
            studentName: c.admission?.student?.studentsDetails?.[0]?.studentName || "Unknown",
            admissionNo: c.admission?.admissionNumber || "N/A",
            chequeNumber: c.transactionId || "N/A",
            bankName: c.accountHolderName || "N/A",
            amount: c.paidAmount,
            chequeDate: c.chequeDate,
            status: c.status === "PAID" ? "Cleared" : (c.status === "REJECTED" ? "Rejected" : (c.status === "CANCELLED" ? "Cancelled" : "Pending")), // Map backend status to UI status
            centre: c.admission?.centre || "N/A",
            course: c.admission?.course?.courseName || "N/A",
            department: c.admission?.department?.departmentName || "N/A"
        }));

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

        const admission = await Admission.findById(payment.admission);
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
        await revertPaymentVariance(payment, admission);

        // 1. Update Payment record
        payment.status = "CANCELLED"; // Or "REJECTED" if you want to reuse that enum
        payment.remarks = (payment.remarks ? payment.remarks + "; " : "") + `CANCELLED: ${reason}`;
        await payment.save();

        // 2. Update Admission paymentBreakdown or Down Payment
        if (payment.installmentNumber === 0) {
            // If it was a down payment
            if (admission.downPaymentStatus === "PAID" || admission.downPaymentStatus === "PENDING_CLEARANCE") {
                admission.downPaymentStatus = "REJECTED"; // Logic similar to rejection, or add CANCELLED status enum
                // Note: Schema has ["PENDING", "PAID", "PENDING_CLEARANCE", "REJECTED"] for downPaymentStatus.
                // We'll use REJECTED to signify it's invalid now, or consider adding CANCELLED if strictly needed.
                // Using REJECTED for now to be safe with existing enum validation.
            }
            admission.remarks = (admission.remarks ? admission.remarks + "; " : "") + `Down payment cheque cancelled: ${reason}`;
        } else {
            // If it was an installment
            const installment = admission.paymentBreakdown.find(
                p => p.installmentNumber === payment.installmentNumber
            );

            if (installment) {
                // Revert to PENDING or OVERDUE
                const today = new Date();
                if (new Date(installment.dueDate) < today) {
                    installment.status = "OVERDUE";
                } else {
                    installment.status = "PENDING";
                }
                installment.paidAmount = 0;
                installment.paymentMethod = null;
                installment.transactionId = null;
                installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Cheque cancelled: ${reason}`;

                // If it was marked as paid, we need to subtract from totalPaidAmount?
                // Yes, logic below handles totalPaidAmount recalculation.
            }
        }

        // 3. Recalculate totalPaidAmount
        // This is crucial to ensure financial accuracy
        admission.totalPaidAmount = admission.paymentBreakdown.reduce(
            (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
            0
        ) + (admission.downPaymentStatus === "PAID" ? admission.downPayment : 0);

        // Recalculate remaining amount
        admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

        // Update paymentStatus
        if (admission.totalPaidAmount >= admission.totalFees) {
            admission.paymentStatus = "COMPLETED";
            admission.remainingAmount = 0; // Ensure it's exactly 0 when completed
        } else {
            // If it was completed, it might go back to partial or pending
            if (admission.totalPaidAmount > 0) {
                admission.paymentStatus = "PARTIAL";
            } else {
                admission.paymentStatus = "PENDING";
            }
        }

        // 4. Update Board Course monthly history if applicable
        if (admission.admissionType === 'BOARD' && payment.billingMonth) {
            const historyEntry = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
            if (historyEntry) {
                historyEntry.isPaid = false;
            }
        }

        await admission.save();

        res.status(200).json({ message: "Cheque cancelled successfully" });
    } catch (error) {
        console.error("Cancel Cheque Error:", error);
        res.status(500).json({ message: "Error cancelling cheque", error: error.message });
    }
};
