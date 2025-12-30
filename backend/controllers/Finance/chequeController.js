import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";

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

        const formattedCheques = cheques.map(c => ({
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

        // Update overall payment status
        if (admission.totalPaidAmount >= admission.totalFees) {
            admission.paymentStatus = "COMPLETED";
        } else {
            admission.paymentStatus = "PARTIAL";
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

        await admission.save();

        res.status(200).json({ message: "Cheque rejected successfully" });
    } catch (error) {
        console.error("Reject Cheque Error:", error);
        res.status(500).json({ message: "Error rejecting cheque", error: error.message });
    }
};
