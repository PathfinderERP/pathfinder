import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Board from "../../models/Master_data/Boards.js";
import Payment from "../../models/Payment/Payment.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";

// Global rebalance logic for Board admissions
export const rebalanceBoardHistory = async (admissionId) => {
    const admission = await Admission.findById(admissionId);
    if (!admission || admission.admissionType !== "BOARD") return null;

    const payments = await Payment.find({ admission: admissionId });
    
    // 1. Deduplicate payments by billId
    const uniquePayments = [];
    const seenBills = new Set();
    for (const p of payments) {
        const id = (p.billId || p._id).toString();
        if (!seenBills.has(id)) {
            seenBills.add(id);
            uniquePayments.push(p);
        }
    }

    const duration = admission.courseDurationMonths || 1;
    // Course-wide adjustments
    const monthlyDiscount = Math.round((admission.discountAmount || 0) / duration);
    const monthlyPrevBal = Math.round((admission.previousBalance || 0) / duration);

    // 2. Group payments strictly by their designated month
    const monthPaymentMap = {};
    uniquePayments.forEach(p => {
        if (p.status !== "PAID" && p.status !== "PENDING_CLEARANCE") return;
        const mKey = p.billingMonth || "DOWN_PAYMENT";
        monthPaymentMap[mKey] = (monthPaymentMap[mKey] || 0) + (p.paidAmount || 0);
    });

    admission.monthlySubjectHistory.sort((a, b) => a.month.localeCompare(b.month));

    let carryForwardCredit = 0; 
    let grandTotalMoney = 0;

    for (let i = 0; i < admission.monthlySubjectHistory.length; i++) {
        const entry = admission.monthlySubjectHistory[i];
        
        // A. Assign EXACT receipt money to this month (No splitting)
        let moneyPaidThisMonth = monthPaymentMap[entry.month] || 0;
        if (i === 0 && monthPaymentMap["DOWN_PAYMENT"]) {
            moneyPaidThisMonth += monthPaymentMap["DOWN_PAYMENT"];
        }
        entry.paidAmount = Math.round(moneyPaidThisMonth);
        grandTotalMoney += entry.paidAmount;

        // B. Calculate GROSS Monthly Bill
        const subSum = entry.subjects.reduce((sum, s) => sum + (s.price || 0), 0);
        const grossBill = Math.max(0, Math.round(subSum * 1.18));
        entry.totalAmount = grossBill;

        // C. Apply monthly adjustments to the credit bucket
        carryForwardCredit += (monthlyDiscount - monthlyPrevBal);

        // D. Logical Waterfall for Status (Carries both Surplus AND Deficit)
        const totalAvailableForThisMonth = entry.paidAmount + carryForwardCredit;
        
        if (totalAvailableForThisMonth >= grossBill - 0.5) {
            entry.isPaid = true;
            // Carry surplus forward
            carryForwardCredit = totalAvailableForThisMonth - grossBill;
            
            const bills = uniquePayments.filter(p => p.billingMonth === entry.month);
            if (bills.some(p => p.status === "PENDING_CLEARANCE")) {
                entry.status = "PENDING_CLEARANCE";
                entry.isPaid = false;
            } else {
                entry.status = "PAID";
            }
        } else {
            entry.isPaid = false;
            entry.status = (totalAvailableForThisMonth > 0.1) ? "PARTIAL" : "PENDING";
            // Carry deficit forward (negative carryForwardCredit)
            carryForwardCredit = totalAvailableForThisMonth - grossBill;
        }
    }

    // 3. Update overall admission totals
    admission.totalPaidAmount = grandTotalMoney;
    admission.totalFees = admission.monthlySubjectHistory.reduce((sum, h) => sum + h.totalAmount, 0) - (admission.discountAmount || 0) + (admission.previousBalance || 0);
    admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);
    
    if (admission.remainingAmount <= 0.5) {
        admission.paymentStatus = "COMPLETED";
    } else if (admission.totalPaidAmount > 0) {
        admission.paymentStatus = "PARTIAL";
    } else {
        admission.paymentStatus = "PENDING";
    }

    await admission.save();
    return admission;
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
        courseStartDate.setDate(1); // Set to 1st to avoid month overflow (e.g. Jan 31 -> Mar)
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

                        // If it's the CURRENT month being paid, set status
                        if (mKey === billingMonth && Number(paymentAmount) >= totalAmount) {
                            const isCheque = (paymentMethod === "CHEQUE");
                            admission.monthlySubjectHistory[histologicalIndex].isPaid = !isCheque;
                            admission.monthlySubjectHistory[histologicalIndex].status = isCheque ? "PENDING_CLEARANCE" : "PAID";
                        }
                    }
                } else {
                    // Create new history entry
                    admission.monthlySubjectHistory.push({
                        month: mKey,
                        subjects: selectedSubjectsData,
                        totalAmount: totalAmount,
                        isPaid: (mKey === billingMonth && Number(paymentAmount) >= totalAmount && paymentMethod !== "CHEQUE"),
                        status: (mKey === billingMonth && Number(paymentAmount) >= totalAmount)
                            ? (paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID")
                            : "PENDING"
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

            const subNames = validSelectedSubjects.map(s => s.name).join('+');
            const sessionStr = admission.academicSession || '';
            const boardName = admission.board?.boardCourse || 'Board Course';
            const specificBoardCourseName = `${boardName} ${sessionStr} ${subNames}`.trim();

            // Find the index of the billing month in history to use as installment number
            const monthIdx = admission.monthlySubjectHistory.findIndex(h => h.month === billingMonth);
            const calculatedInstNum = monthIdx >= 0 ? monthIdx + 1 : 99; // Fallback to 99 if not found

            if (existingPayment) {
                // Update existing record
                existingPayment.installmentNumber = calculatedInstNum;
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

                // Generate bill ID for all methods if missing
                if (!existingPayment.billId) {
                    existingPayment.billId = await generateBillId(centreCode);
                }

                await existingPayment.save();
            } else {
                // Generate bill ID for all methods to allow receipts
                let newBillId = await generateBillId(centreCode);

                const paymentData = {
                    admission: admission._id,
                    installmentNumber: calculatedInstNum,
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
                    cgst: cgstAmount,
                    sgst: sgstAmount,
                    courseFee: baseFees,
                    totalAmount: totalAmount
                };

                if (newBillId) {
                    paymentData.billId = newBillId;
                }

                const payment = new Payment(paymentData);
                await payment.save();
            }

            // Update Centre Target Achieved
            if (paymentAmount > 0 && admission.centre) {
                updateCentreTargetAchieved(admission.centre, new Date());
            }
        }

        await rebalanceBoardHistory(admissionId);

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

    const payments = await Payment.find({ admission: admission._id });
    const breakdown = [];
    const startDate = new Date(admission.admissionDate || admission.createdAt);
    startDate.setDate(1);

    let carryForward = 0;
    const durationCount = admission.courseDurationMonths;

    for (let i = 0; i < durationCount; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(monthDate.getMonth() + i);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        const histEntry = admission.monthlySubjectHistory.find(h => h.month === monthKey);
        let paymentEntry = payments.find(p => p.billingMonth === monthKey);

        if (!paymentEntry && i === 0) {
            paymentEntry = payments.find(p => p.installmentNumber === 0);
        }

        const displayPaidAmount = histEntry ? (histEntry.paidAmount || 0) : 0;
        
        // Match rebalancer logic: add this month's share of discount/arrears
        const monthlyDiscount = Math.round((admission.discountAmount || 0) / durationCount);
        const monthlyPrevBal = Math.round((admission.previousBalance || 0) / durationCount);
        carryForward += (monthlyDiscount - monthlyPrevBal);

        const totalAvailable = displayPaidAmount + carryForward;
        const monthlyBill = histEntry ? (histEntry.totalAmount || 0) : 0;
        
        breakdown.push({
            month: monthKey,
            monthName: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            subjects: histEntry ? histEntry.subjects : [],
            totalAmount: monthlyBill,
            paidAmount: displayPaidAmount,
            carryForward: carryForward - displayPaidAmount, // Previous excess + discount
            isPaid: histEntry ? histEntry.isPaid : false,
            paymentStatus: histEntry ? (histEntry.status || "PENDING") : "PENDING",
            billId: paymentEntry?.billId || null,
            receivedDate: paymentEntry?.receivedDate || paymentEntry?.paidDate,
            dueDate: monthDate
        });

        // Update carryForward for next month
        carryForward = totalAvailable - monthlyBill;
    }

    return breakdown;
};

export const getMonthlyBreakdown = async (req, res) => {
    try {
        const { admissionId } = req.params;

        // Try Admission model first (Legacy/Flexible Board)
        let admission = await Admission.findById(admissionId)
            .populate('board')
            .populate('monthlySubjectHistory.subjects.subject');

        if (admission) {
            if (admission.admissionType !== "BOARD") {
                return res.status(400).json({ message: "This operation is only for Board admissions" });
            }
            const breakdown = await generateMonthlyBreakdown(admission);
            return res.status(200).json({
                admission,
                monthlyBreakdown: breakdown,
                courseDurationMonths: admission.courseDurationMonths
            });
        }

        // Try BoardCourseAdmission model (Structured Board)
        let boardAdmission = await BoardCourseAdmission.findById(admissionId)
            .populate('boardId')
            .populate('installments.subjects.subjectId');

        if (boardAdmission) {
            const breakdown = boardAdmission.installments.map(inst => {
                const monthDate = new Date(inst.dueDate);
                const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
                
                // Find payment record to get billId if any
                // (Note: Structured Board also creates Payment records)
                return {
                    month: monthKey,
                    monthName: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    subjects: inst.subjects.map(s => ({
                        _id: s.subjectId?._id,
                        name: s.subjectId?.subName || s.subjectId?.name || "Subject",
                        price: s.price
                    })),
                    totalAmount: inst.standardAmount - inst.waiverAmount,
                    paidAmount: inst.paidAmount,
                    carryForward: inst.adjustmentAmount || 0,
                    isPaid: inst.status === "PAID",
                    paymentStatus: inst.status,
                    billId: null, // We could look this up in the Payment collection if needed
                    receivedDate: inst.paymentTransactions?.[0]?.date || inst.dueDate,
                    dueDate: inst.dueDate
                };
            });

            return res.status(200).json({
                admission: {
                    ...boardAdmission.toObject(),
                    admissionType: 'BOARD', // Ensure consistency
                    board: boardAdmission.boardId, // Map boardId to board
                },
                monthlyBreakdown: breakdown,
                courseDurationMonths: boardAdmission.totalDurationMonths
            });
        }

        return res.status(404).json({ message: "Admission record not found in any collection." });

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
        courseStartDate.setDate(1); // Set to 1st to avoid month overflow
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
