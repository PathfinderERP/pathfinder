import Admission from "../../models/Admission/Admission.js";
import Board from "../../models/Master_data/Boards.js";
import Payment from "../../models/Payment/Payment.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";

// Generate a unique sequential bill ID
const generateBillId = async (centreCode) => {
    try {
        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();

        const currentYear = year;
        const currentMonth = month;

        let startYear, endYear;
        if (currentMonth >= 3) {
            startYear = currentYear;
            endYear = currentYear + 1;
        } else {
            startYear = currentYear - 1;
            endYear = currentYear;
        }

        const yearStr = `${startYear}-${endYear.toString().slice(-2)}`;
        const prefix = `PATH/${centreCode}/${yearStr}/`;

        const lastPayment = await Payment.findOne({
            billId: { $regex: new RegExp(`^${prefix.replace(/\//g, '\\/')}\\d+$`) }
        }).sort({ createdAt: -1 });

        let nextNumber = 1;

        if (lastPayment && lastPayment.billId) {
            const lastId = lastPayment.billId;
            const parts = lastId.split('/');
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

export const generateMonthlyBill = async (req, res) => {
    try {
        const { admissionId } = req.params;
        const {
            selectedSubjectIds,
            billingMonth, // Format: "2026-01"
            paymentAmount,
            paymentMethod = "CASH",
            transactionId = "",
            accountHolderName = "",
            chequeDate = "",
            receivedDate = ""
        } = req.body;

        // Validate required fields
        if (!selectedSubjectIds || selectedSubjectIds.length === 0 || !billingMonth || !paymentAmount) {
            return res.status(400).json({ message: "Selected subjects, billing month, and payment amount are required" });
        }

        // Fetch the admission
        const admission = await Admission.findById(admissionId).populate('board');
        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.admissionType !== "BOARD") {
            return res.status(400).json({ message: "This operation is only for Board admissions" });
        }

        // Check if bill already exists for this month
        const existingPayment = await Payment.findOne({
            admission: admissionId,
            billingMonth: billingMonth
        });

        if (existingPayment) {
            return res.status(400).json({ message: "Bill already generated for this month" });
        }

        // Fetch Board with populated subjects
        const board = await Board.findById(admission.board._id).populate("subjects.subjectId");
        if (!board) {
            return res.status(404).json({ message: "Board not found" });
        }

        // Validate and calculate fees based on Board's configuration
        const validSelectedSubjects = [];
        for (const subjectId of selectedSubjectIds) {
            const boardSubject = board.subjects.find(s => s.subjectId._id.toString() === subjectId);
            if (boardSubject) {
                validSelectedSubjects.push({
                    _id: boardSubject.subjectId._id,
                    subName: boardSubject.subjectId.subName,
                    price: boardSubject.price || 0
                });
            }
        }

        if (validSelectedSubjects.length !== selectedSubjectIds.length) {
            return res.status(400).json({ message: "One or more subjects not configured for this board" });
        }

        const baseFees = validSelectedSubjects.reduce((sum, sub) => sum + sub.price, 0);
        const selectedSubjectsData = validSelectedSubjects.map(sub => ({
            subject: sub._id,
            name: sub.subName,
            price: sub.price
        }));

        // Calculate taxes
        const taxableAmount = baseFees;
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);
        const totalAmount = taxableAmount + cgstAmount + sgstAmount;

        // Update admission's monthly subject history
        const existingMonthIndex = admission.monthlySubjectHistory.findIndex(h => h.month === billingMonth);

        if (existingMonthIndex >= 0) {
            // Update existing month
            admission.monthlySubjectHistory[existingMonthIndex] = {
                month: billingMonth,
                subjects: selectedSubjectsData,
                totalAmount: totalAmount,
                isPaid: (paymentMethod !== "CHEQUE" && paymentAmount >= totalAmount)
            };
        } else {
            // Add new month
            admission.monthlySubjectHistory.push({
                month: billingMonth,
                subjects: selectedSubjectsData,
                totalAmount: totalAmount,
                isPaid: (paymentMethod !== "CHEQUE" && paymentAmount >= totalAmount)
            });
        }

        // Update current billing month and selected subjects
        admission.billingMonth = billingMonth;
        admission.selectedSubjects = selectedSubjectsData;

        await admission.save();

        // Create Payment record for this month
        if (paymentAmount > 0) {
            // Fetch Centre Info for Bill ID
            let centreObj = await CentreSchema.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            // Only generate bill ID if NOT a cheque
            let newBillId = null;
            if (paymentMethod !== "CHEQUE") {
                newBillId = await generateBillId(centreCode);
            }

            const payment = new Payment({
                admission: admission._id,
                installmentNumber: 0, // Monthly payment
                amount: totalAmount,
                paidAmount: paymentAmount,
                dueDate: new Date(),
                paidDate: new Date(),
                receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                accountHolderName: accountHolderName,
                chequeDate: chequeDate,
                billingMonth: billingMonth,
                remarks: `Monthly Payment for ${billingMonth}`,
                recordedBy: req.user._id,
                // Bill Details
                billId: newBillId,
                cgst: cgstAmount,
                sgst: sgstAmount,
                courseFee: baseFees,
                totalAmount: totalAmount
            });
            await payment.save();

            // Update Centre Target Achieved
            if (paymentAmount > 0 && admission.centre) {
                updateCentreTargetAchieved(admission.centre, new Date());
            }
        }

        const updatedAdmission = await Admission.findById(admission._id)
            .populate('student')
            .populate('board')
            .populate('selectedSubjects.subject')
            .populate('monthlySubjectHistory.subjects.subject')
            .populate('class')
            .populate('createdBy', 'name');

        res.status(200).json({
            message: "Monthly bill generated successfully",
            admission: updatedAdmission,
            monthlyBreakdown: generateMonthlyBreakdown(updatedAdmission)
        });

    } catch (err) {
        console.error("Generate monthly bill error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Helper function to generate monthly breakdown
const generateMonthlyBreakdown = (admission) => {
    if (admission.admissionType !== "BOARD" || !admission.courseDurationMonths) {
        return [];
    }

    const breakdown = [];
    const startDate = new Date(admission.admissionDate);

    for (let i = 0; i < admission.courseDurationMonths; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(monthDate.getMonth() + i);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        const historyEntry = admission.monthlySubjectHistory.find(h => h.month === monthKey);

        breakdown.push({
            month: monthKey,
            monthName: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            subjects: historyEntry ? historyEntry.subjects : [],
            totalAmount: historyEntry ? historyEntry.totalAmount : 0,
            isPaid: historyEntry ? historyEntry.isPaid : false,
            dueDate: monthDate
        });
    }

    return breakdown;
};

export const getMonthlyBreakdown = async (req, res) => {
    try {
        const { admissionId } = req.params;

        const admission = await Admission.findById(admissionId)
            .populate('board')
            .populate('monthlySubjectHistory.subjects.subject');

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.admissionType !== "BOARD") {
            return res.status(400).json({ message: "This operation is only for Board admissions" });
        }

        const breakdown = generateMonthlyBreakdown(admission);

        res.status(200).json({
            admission,
            monthlyBreakdown: breakdown,
            courseDurationMonths: admission.courseDurationMonths
        });

    } catch (err) {
        console.error("Get monthly breakdown error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
