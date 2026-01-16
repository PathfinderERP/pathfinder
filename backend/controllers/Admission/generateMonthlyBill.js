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

        console.log("Generating bill for:", { admissionId, billingMonth, paymentAmount, subjectCount: selectedSubjectIds?.length });

        if (!selectedSubjectIds || selectedSubjectIds.length === 0) {
            console.log("Missing subjects");
            return res.status(400).json({ message: "Please select at least one subject" });
        }
        if (!billingMonth) {
            console.log("Missing billing month");
            return res.status(400).json({ message: "Billing month is required" });
        }
        if (!paymentAmount || Number(paymentAmount) <= 0) {
            console.log("Invalid amount:", paymentAmount);
            return res.status(400).json({ message: "Invalid payment amount. Ensure subjects are configured and selected." });
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

        if (existingPayment && existingPayment.status === "PAID") {
            return res.status(400).json({ message: `A bill for ${billingMonth} has already been paid and cannot be regenerated.` });
        }

        console.log(existingPayment ? "Found existing PENDING/UNPAID bill, updating..." : "No existing bill found, creating new...");

        // Fetch Board with populated subjects
        const boardId = admission.board?._id || admission.board;
        const board = await Board.findById(boardId).populate("subjects.subjectId");
        if (!board) {
            console.log("Board not found for ID:", boardId);
            return res.status(404).json({ message: "Board not found" });
        }
        console.log("Board found. Board Name:", board.boardCourse);

        // Validate and calculate fees based on Board's configuration
        const validSelectedSubjects = [];
        console.log("Starting subject validation. Board subjects count:", board.subjects?.length);

        for (const subjectId of selectedSubjectIds) {
            const boardSubject = board.subjects.find(s => {
                const sId = s.subjectId?._id || s.subjectId;
                return sId && sId.toString() === subjectId.toString();
            });

            if (boardSubject && boardSubject.subjectId) {
                validSelectedSubjects.push({
                    _id: boardSubject.subjectId._id || boardSubject.subjectId,
                    subName: boardSubject.subjectId.subName || "Unknown Subject",
                    price: Number(boardSubject.price) || 0
                });
            } else {
                console.log("Subject not found in board config:", subjectId);
            }
        }

        if (validSelectedSubjects.length !== selectedSubjectIds.length) {
            console.log("Subject mismatch!", {
                selectedCount: selectedSubjectIds.length,
                validCount: validSelectedSubjects.length,
                selectedIds: selectedSubjectIds,
                validIds: validSelectedSubjects.map(v => v._id)
            });
            const missingCount = selectedSubjectIds.length - validSelectedSubjects.length;
            return res.status(400).json({
                message: `${missingCount} selected subject(s) are not configured for this board correctly. Please check Master Data > Boards.`,
            });
        }
        console.log("All selected subjects validated against board configuration.");

        const baseFees = validSelectedSubjects.reduce((sum, sub) => sum + sub.price, 0);
        const selectedSubjectsData = validSelectedSubjects.map(sub => ({
            subject: sub._id,
            name: sub.subName,
            price: sub.price
        }));
        console.log("Base fees calculated:", baseFees);

        // Calculate taxes
        const taxableAmount = baseFees;
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);
        const totalAmount = taxableAmount + cgstAmount + sgstAmount;
        console.log("Total amount with taxes:", totalAmount);

        // Propagation Logic: Update this month and ALL future UNPAID months
        const courseStartDate = new Date(admission.admissionDate || admission.createdAt);
        for (let i = 0; i < admission.courseDurationMonths; i++) {
            const mDate = new Date(courseStartDate);
            mDate.setMonth(mDate.getMonth() + i);
            const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;

            // Only propagate to current month or future months
            if (mKey >= billingMonth) {
                const histologicalIndex = admission.monthlySubjectHistory.findIndex(h => h.month === mKey);

                if (histologicalIndex >= 0) {
                    // Only update if NOT paid
                    if (!admission.monthlySubjectHistory[histologicalIndex].isPaid) {
                        admission.monthlySubjectHistory[histologicalIndex].subjects = selectedSubjectsData;
                        admission.monthlySubjectHistory[histologicalIndex].totalAmount = totalAmount;

                        // If it's the CURRENT month being paid, set isPaid
                        if (mKey === billingMonth && paymentMethod !== "CHEQUE" && Number(paymentAmount) >= totalAmount) {
                            admission.monthlySubjectHistory[histologicalIndex].isPaid = true;
                        }
                    }
                } else {
                    // Create new history entry
                    admission.monthlySubjectHistory.push({
                        month: mKey,
                        subjects: selectedSubjectsData,
                        totalAmount: totalAmount,
                        isPaid: (mKey === billingMonth && paymentMethod !== "CHEQUE" && Number(paymentAmount) >= totalAmount)
                    });
                }
            }
        }

        // Sort history by month to keep it clean
        admission.monthlySubjectHistory.sort((a, b) => a.month.localeCompare(b.month));

        // Update admission totals
        if (!existingPayment || existingPayment.status !== "PAID") {
            // Only update paid amount if this is a new payment action
            const isCheque = (paymentMethod === "CHEQUE");
            if (!isCheque) {
                admission.totalPaidAmount = (admission.totalPaidAmount || 0) + Number(paymentAmount);
                admission.remainingAmount = (admission.totalFees || 0) - admission.totalPaidAmount;
                if (admission.remainingAmount < 0) admission.remainingAmount = 0;

                if (admission.totalPaidAmount >= admission.totalFees) {
                    admission.paymentStatus = "COMPLETED";
                }
            }
        }

        await admission.save();

        // Create or Update Payment record for this month
        if (paymentAmount > 0) {
            // Fetch Centre Info for Bill ID
            let centreObj = await CentreSchema.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            const subNames = validSelectedSubjects.map(s => s.subName).join('+');
            const sessionStr = admission.academicSession || '';
            const boardName = board.boardCourse || 'Board Course';
            const specificBoardCourseName = `${boardName} ${sessionStr} ${subNames}`.trim();

            if (existingPayment) {
                // Update existing record
                existingPayment.amount = totalAmount;
                existingPayment.paidAmount = (existingPayment.paidAmount || 0) + Number(paymentAmount);
                existingPayment.status = (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID";
                existingPayment.paymentMethod = paymentMethod;
                existingPayment.transactionId = transactionId || existingPayment.transactionId;
                existingPayment.accountHolderName = accountHolderName || existingPayment.accountHolderName;
                existingPayment.chequeDate = chequeDate || existingPayment.chequeDate;
                existingPayment.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
                existingPayment.boardCourseName = specificBoardCourseName;
                existingPayment.cgst = cgstAmount;
                existingPayment.sgst = sgstAmount;
                existingPayment.courseFee = baseFees;
                existingPayment.totalAmount = totalAmount;

                // Keep existing billId or generate if missing
                if (!existingPayment.billId && paymentMethod !== "CHEQUE") {
                    existingPayment.billId = await generateBillId(centreCode);
                }

                await existingPayment.save();
            } else {
                // Create NEW Payment record
                let newBillId = null;
                if (paymentMethod !== "CHEQUE") {
                    newBillId = await generateBillId(centreCode);
                }

                const payment = new Payment({
                    admission: admission._id,
                    installmentNumber: 0,
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
                    boardCourseName: specificBoardCourseName,
                    remarks: `Monthly Payment for ${billingMonth}`,
                    recordedBy: req.user._id,
                    billId: newBillId,
                    cgst: cgstAmount,
                    sgst: sgstAmount,
                    courseFee: baseFees,
                    totalAmount: totalAmount
                });
                await payment.save();
            }

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
            monthlyBreakdown: await generateMonthlyBreakdown(updatedAdmission)
        });

    } catch (err) {
        console.error("Generate monthly bill error:", err);
        res.status(500).json({ message: "Server error during monthly bill generation.", error: err.message });
    }
};

// Helper function to generate monthly breakdown
export const generateMonthlyBreakdown = async (admission) => {
    if (admission.admissionType !== "BOARD" || !admission.courseDurationMonths) {
        return [];
    }

    // Fetch ALL payments for this admission to sync status
    const payments = await Payment.find({ admission: admission._id });

    const breakdown = [];
    const startDate = new Date(admission.admissionDate || admission.createdAt);

    for (let i = 0; i < admission.courseDurationMonths; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(monthDate.getMonth() + i);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        const actualHistoryEntry = admission.monthlySubjectHistory.find(h => h.month === monthKey);

        // Find payment for this month. 
        // Logic: Match by billingMonth OR if it's the first month (i=0), match the 'Down Payment' (installment 0)
        let paymentEntry = payments.find(p => p.billingMonth === monthKey);

        // Fallback for first month's downpayment if billingMonth was not set correctly
        if (!paymentEntry && i === 0) {
            paymentEntry = payments.find(p => p.installmentNumber === 0 && (!p.billingMonth || p.billingMonth === monthKey));
        }

        // Logical Inheritance for DISPLAY ONLY: If no history entry, look at the most recent previous one for subjects/amount
        let displayHistory = actualHistoryEntry;
        if (!displayHistory) {
            for (let j = i - 1; j >= 0; j--) {
                const prevDate = new Date(startDate);
                prevDate.setMonth(prevDate.getMonth() + j);
                const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
                const prevEntry = admission.monthlySubjectHistory.find(h => h.month === prevKey);
                if (prevEntry) {
                    displayHistory = prevEntry;
                    break;
                }
            }
        }

        const isPaidStatus = (actualHistoryEntry?.isPaid === true) || (paymentEntry?.status === "PAID");

        breakdown.push({
            month: monthKey,
            monthName: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            subjects: displayHistory ? displayHistory.subjects : [],
            totalAmount: displayHistory ? displayHistory.totalAmount : 0,
            isPaid: isPaidStatus,
            paymentStatus: isPaidStatus ? "PAID" : (paymentEntry?.status || "PENDING"),
            billId: paymentEntry?.billId || null,
            receivedDate: paymentEntry?.receivedDate || paymentEntry?.paidDate,
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

        const breakdown = await generateMonthlyBreakdown(admission);

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
export const updateBoardSubjects = async (req, res) => {
    try {
        const { admissionId } = req.params;
        const { selectedSubjectIds, billingMonth } = req.body;

        if (!selectedSubjectIds || selectedSubjectIds.length === 0 || !billingMonth) {
            return res.status(400).json({ message: "Subjects and billing month are required" });
        }

        const admission = await Admission.findById(admissionId).populate('board');
        if (!admission) return res.status(404).json({ message: "Admission not found" });

        // Fetch Board with populated subjects
        const board = await Board.findById(admission.board._id).populate("subjects.subjectId");
        if (!board) return res.status(404).json({ message: "Board not found" });

        // Validate and calculate fees
        const validSelectedSubjects = [];
        for (const subjectId of selectedSubjectIds) {
            const boardSubject = board.subjects.find(s => s.subjectId._id.toString() === subjectId);
            if (boardSubject) {
                validSelectedSubjects.push({
                    subject: boardSubject.subjectId._id,
                    name: boardSubject.subjectId.subName,
                    price: boardSubject.price || 0
                });
            }
        }

        if (validSelectedSubjects.length !== selectedSubjectIds.length) {
            return res.status(400).json({ message: "One or more subjects not configured for this board" });
        }

        const baseFees = validSelectedSubjects.reduce((sum, sub) => sum + sub.price, 0);
        const taxableAmount = baseFees;
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);
        const totalAmount = taxableAmount + cgstAmount + sgstAmount;

        // Propagation Logic for updateBoardSubjects: Update this month and ALL future UNPAID months
        const courseStartDate = new Date(admission.admissionDate || admission.createdAt);
        for (let i = 0; i < admission.courseDurationMonths; i++) {
            const mDate = new Date(courseStartDate);
            mDate.setMonth(mDate.getMonth() + i);
            const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;

            if (mKey >= billingMonth) {
                const histIdx = admission.monthlySubjectHistory.findIndex(h => h.month === mKey);

                if (histIdx >= 0) {
                    if (!admission.monthlySubjectHistory[histIdx].isPaid) {
                        admission.monthlySubjectHistory[histIdx].subjects = validSelectedSubjects;
                        admission.monthlySubjectHistory[histIdx].totalAmount = totalAmount;
                    }
                } else {
                    admission.monthlySubjectHistory.push({
                        month: mKey,
                        subjects: validSelectedSubjects,
                        totalAmount: totalAmount,
                        isPaid: false
                    });
                }
            }
        }

        // Sort history
        admission.monthlySubjectHistory.sort((a, b) => a.month.localeCompare(b.month));

        // Also update totalFees in Admission to be the sum of all months
        // This is important for the overall balance tracking
        const allMonthsTotal = admission.monthlySubjectHistory.reduce((sum, h) => sum + (h.totalAmount || 0), 0);
        admission.totalFees = allMonthsTotal;
        admission.remainingAmount = admission.totalFees - admission.totalPaidAmount;

        await admission.save();

        const updatedAdmission = await Admission.findById(admission._id)
            .populate('student')
            .populate('board')
            .populate('selectedSubjects.subject')
            .populate('monthlySubjectHistory.subjects.subject');

        res.status(200).json({
            message: "Subjects updated successfully",
            admission: updatedAdmission,
            monthlyBreakdown: await generateMonthlyBreakdown(updatedAdmission)
        });

    } catch (err) {
        console.error("Update board subjects error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
