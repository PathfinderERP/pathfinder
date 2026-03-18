import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Boards from "../../models/Master_data/Boards.js";
import Subject from "../../models/Master_data/Subject.js";
import Students from "../../models/Students.js";
import Payment from "../../models/Payment/Payment.js";
import Centre from "../../models/Master_data/Centre.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import mongoose from "mongoose";

// Helper to calculate next months due date
const getNextMonthDate = (startDate, monthsToAdd) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + monthsToAdd);
    return date;
};

export const createBoardAdmission = async (req, res) => {
    try {
        const {
            studentId,
            boardId,
            selectedSubjectIds,
            totalDurationMonths,
            totalWaiver,
            downPayment,
            billingStartDate,
            academicSession,
            centre,
            remarks,
            paymentMethod,
            transactionId
        } = req.body;

        // 1. Fetch Board and Subjects to get current prices
        const board = await Boards.findById(boardId).populate('subjects.subjectId');
        if (!board) return res.status(404).json({ message: "Board not found" });

        const activeSubjects = board.subjects.filter(s => 
            selectedSubjectIds.includes(s.subjectId._id.toString())
        );

        if (activeSubjects.length === 0) {
            return res.status(400).json({ message: "No valid subjects selected" });
        }

        const totalSubjectMonthlyFee = activeSubjects.reduce((sum, s) => sum + s.price, 0);
        const monthlyWaiver = totalWaiver / totalDurationMonths;
        const expectedMonthly = totalSubjectMonthlyFee - monthlyWaiver;

        // 2. Prepare Installments
        let installments = [];
        let runningBalance = 0; 
        let adjustmentApplied = false;

        for (let i = 1; i <= totalDurationMonths; i++) {
            let dueDate = getNextMonthDate(billingStartDate, i - 1);
            let inst = {
                monthNumber: i,
                dueDate: dueDate,
                standardAmount: totalSubjectMonthlyFee,
                subjects: activeSubjects.map(as => ({
                    subjectId: as.subjectId._id,
                    price: as.price
                })),
                waiverAmount: monthlyWaiver,
                paidAmount: 0,
                paymentTransactions: []
            };

            const netMonthly = inst.standardAmount - inst.waiverAmount;

            // Month 1 Logic: Always handles Down Payment
            if (i === 1) {
                inst.paidAmount = downPayment;
                if (downPayment > 0) {
                    inst.paymentTransactions.push({
                        amount: downPayment,
                        date: new Date(),
                        paymentMethod: paymentMethod || "CASH",
                        transactionId: transactionId || "DP-" + Date.now(),
                        receivedBy: req.user?._id
                    });
                }
                inst.adjustmentAmount = 0;
                inst.payableAmount = Math.max(0, netMonthly);
                inst.status = "PAID"; // Locked at admission
                
                runningBalance += (inst.paidAmount - netMonthly);
                installments.push(inst);
                continue;
            }

            // Months 2+ Logic: Apply adjustment only to the NEXT one
            if (!adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                inst.adjustmentAmount = -runningBalance;
                adjustmentApplied = true;
            } else {
                inst.adjustmentAmount = 0;
            }

            const fullPayable = netMonthly + inst.adjustmentAmount;
            inst.payableAmount = Math.max(0, fullPayable);

            // Update status: Any payment > 0 "closes" the month visually and pushes balance forward
            if (inst.paidAmount > 0.5 || (inst.payableAmount <= 0.5 && inst.standardAmount > 0)) {
                inst.status = "PAID";
            } else {
                inst.status = "PENDING";
            }

            // Carry forward balance ONLY if payment was made
            if (inst.paidAmount > 0.5) {
                runningBalance += (inst.paidAmount - netMonthly);
                // If we pay this month, the adjustment we applied is now "consumed" or "refined"
                // So we can allow the new balance to apply to the next month
                adjustmentApplied = false; 
            }
            
            installments.push(inst);
        }

        // Construct Board Course Name: Board + Subjects + Session
        const subjectNames = activeSubjects.map(s => s.subjectId.subName).join(' + ');
        const boardCourseName = `${board.boardCourse} (${subjectNames}) [${academicSession || 'N/A'}]`;

        const newAdmission = new BoardCourseAdmission({
            studentId,
            boardId,
            selectedSubjects: activeSubjects.map(s => ({
                subjectId: s.subjectId._id,
                priceAtAdmission: s.price
            })),
            totalDurationMonths,
            totalWaiver,
            monthlyWaiver,
            billingStartDate,
            academicSession,
            boardCourseName,
            installments,
            totalExpectedAmount: (expectedMonthly * totalDurationMonths),
            totalPaidAmount: downPayment,
            centre,
            remarks,
            createdBy: req.user?._id
        });

        await newAdmission.save();
        
        // --- Create Payment Record for Down Payment (Billing) ---
        if (downPayment > 0) {
            try {
                let centreObj = await Centre.findOne({ centreName: centre });
                if (!centreObj) {
                    centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, 'i') } });
                }
                const centreCode = centreObj ? centreObj.enterCode : 'GEN';
                const billId = await generateBillId(centreCode);

                const taxableAmount = Number(downPayment) / 1.18;
                const cgst = (Number(downPayment) - taxableAmount) / 2;
                const sgst = cgst;

                const paymentRecord = new Payment({
                    admission: newAdmission._id,
                    installmentNumber: 1,
                    amount: installments[0].payableAmount,
                    paidAmount: Number(downPayment),
                    dueDate: installments[0].dueDate,
                    paidDate: new Date(),
                    receivedDate: new Date(),
                    status: "PAID", // DP is always recorded as PAID
                    paymentMethod: paymentMethod || "CASH",
                    transactionId: transactionId || "DP-" + Date.now(),
                    billingMonth: new Date(installments[0].dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                    recordedBy: req.user?._id,
                    billId: billId,
                    courseFee: taxableAmount,
                    cgst: cgst,
                    sgst: sgst,
                    totalAmount: Number(downPayment),
                    boardCourseName: boardCourseName,
                    remarks: `Board Admission Down Payment / Month 1`
                });
                await paymentRecord.save();
            } catch (pErr) {
                console.error("Error creating DP payment record:", pErr);
            }
        }
        
        // Update student enrollment status if needed
        await Students.findByIdAndUpdate(studentId, { isEnrolled: true });

        res.status(201).json({ 
            message: "Board Course Admission created successfully", 
            admission: newAdmission 
        });

    } catch (error) {
        console.error("Create Board Admission Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getBoardAdmissions = async (req, res) => {
    try {
        const admissions = await BoardCourseAdmission.find()
            .populate('studentId')
            .populate('boardId')
            .populate('selectedSubjects.subjectId')
            .populate('installments.subjects.subjectId');
        res.status(200).json(admissions);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message }); console.error("COLLECT ERROR:", error)
    }
};

export const getBoardAdmissionById = async (req, res) => {
    try {
        const admission = await BoardCourseAdmission.findById(req.params.id)
            .populate('studentId')
            .populate('boardId')
            .populate('selectedSubjects.subjectId')
            .populate('installments.subjects.subjectId');
        if (!admission) return res.status(404).json({ message: "Admission not found" });
        res.status(200).json(admission);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message }); console.error("COLLECT ERROR:", error)
    }
};

export const updateBoardSubjects = async (req, res) => {
    try {
        const { id } = req.params;
        const { selectedSubjectIds, effectiveFromMonth } = req.body;

        const admission = await BoardCourseAdmission.findById(id);
        if (!admission) return res.status(404).json({ message: "Admission not found" });

        const board = await Boards.findById(admission.boardId).populate('subjects.subjectId');
        
        const newActiveSubjects = board.subjects.filter(s => 
            selectedSubjectIds.includes(s.subjectId._id.toString())
        );

        const newTotalSubjectMonthlyFee = newActiveSubjects.reduce((sum, s) => sum + s.price, 0);
        const expectedMonthly = newTotalSubjectMonthlyFee - admission.monthlyWaiver;

        // Start month for the update (default to first pending if not provided)
        const firstPending = admission.installments.find(i => i.paidAmount === 0);
        const startMonth = effectiveFromMonth || (firstPending?.monthNumber || 1);

        // Safety check: Cannot update subjects if any payment has been made for the target month
        const targetInst = admission.installments.find(i => i.monthNumber === startMonth);
        if (targetInst && targetInst.paidAmount > 0) {
            return res.status(400).json({ 
                message: `Cannot update subjects for Month ${startMonth} as payments have already been recorded. Please select a future month.`
            });
        }

        // Recalculate all installments from startMonth onwards
        // We need to maintain the chain of adjustments.
        // adjustment for month N = (paid in N-1) - (payable in N-1) + adjustment from N-1... wait.
        // Simplified: adjustment for month N is the running over/under payment from all previous months.
        
        let runningBalance = 0;
        let adjustmentApplied = false;

        // Recalculate all installments from the beginning to ensure correct balance chain
        for (let i = 0; i < admission.installments.length; i++) {
            const inst = admission.installments[i];
            const netMonthly = (inst.standardAmount || 0) - (inst.waiverAmount || 0);
            
            // Only update subjects/standard fee if we are at or after startMonth
            if (inst.monthNumber >= startMonth) {
                inst.subjects = newActiveSubjects.map(s => ({
                    subjectId: s.subjectId._id,
                    price: s.price
                }));
                inst.standardAmount = newTotalSubjectMonthlyFee;
            }

            if (inst.monthNumber === 1) {
                inst.adjustmentAmount = 0;
            } else {
                // Apply running balance adjustment only to the FIRST unpaid/partial month
                if (!adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                    inst.adjustmentAmount = -runningBalance;
                    adjustmentApplied = true;
                } else {
                    inst.adjustmentAmount = 0;
                }
            }
            
            const fullPayable = ((inst.monthNumber >= startMonth ? newTotalSubjectMonthlyFee : inst.standardAmount) - inst.waiverAmount) + inst.adjustmentAmount;
            inst.payableAmount = Math.max(0, fullPayable);

            // Update status based on payment vs new calculation
            if (inst.paidAmount > 0.5 || (inst.payableAmount <= 0.5 && inst.standardAmount > 0)) {
                inst.status = "PAID";
            } else {
                inst.status = "PENDING";
            }

            // Carry forward balance only if month was already paid or handled
            if (inst.paidAmount > 0.5) {
                runningBalance += (inst.paidAmount - ((inst.monthNumber >= startMonth ? newTotalSubjectMonthlyFee : inst.standardAmount) - inst.waiverAmount));
                adjustmentApplied = false; // Reset to allow next month to take the refined balance
            }
        }

        // Update top-level records
        admission.selectedSubjects = newActiveSubjects.map(s => ({
            subjectId: s.subjectId._id,
            priceAtAdmission: s.price
        }));

        // Refresh dynamic course name if subjects changed
        const subjectNames = newActiveSubjects.map(s => s.subjectId.subName).join(' + ');
        admission.boardCourseName = `${board.boardCourse} (${subjectNames}) [${admission.academicSession || 'N/A'}]`;
        
        // Recalculate total expected amount (already paid + future payables)
        // This keeps the financial history consistent
        let recalculatedExpected = admission.totalPaidAmount;
        admission.installments.forEach(inst => {
            if (inst.status !== "PAID" || inst.paidAmount < inst.payableAmount) {
                // If it's the future or unpaid, the balance is remaining expected
                // This logic needs to be careful: totalExpected = sum(standard - waiver)
                // Simplified: totalExpected = Total of all installments' (standard - waiver)
            }
        });

        // Correct totalExpectedAmount calculation: sum of (standard - waiver) for ALL months
        admission.totalExpectedAmount = admission.installments.reduce((sum, inst) => 
            sum + (inst.standardAmount - inst.waiverAmount), 0);

        await admission.save();
        res.status(200).json({ message: "Subjects updated from month " + startMonth, admission });

    } catch (error) {
        console.error("Update Subjects Error:", error);
        res.status(500).json({ message: "Server error", error: error.message }); console.error("COLLECT ERROR:", error)
    }
};

export const collectBoardInstallment = async (req, res) => {
    try {
        const { id } = req.params;
        const { installmentId, amount, paymentMethod: rawPaymentMethod, transactionId } = req.body;
        // Normalize payment method to match Payment schema enum
        const methodMap = { 'ONLINE': 'UPI', 'NEFT': 'BANK_TRANSFER', 'IMPS': 'BANK_TRANSFER', 'RTGS': 'BANK_TRANSFER' };
        const paymentMethod = methodMap[rawPaymentMethod] || rawPaymentMethod;

        const admission = await BoardCourseAdmission.findById(id);
        if (!admission) return res.status(404).json({ message: "Admission not found" });

        if (!mongoose.Types.ObjectId.isValid(installmentId)) {
            return res.status(400).json({ message: "Invalid installment ID format" });
        }

        const inst = admission.installments.id(installmentId);
        if (!inst) return res.status(404).json({ message: "Installment not found" });

        inst.paidAmount += Number(amount);
        inst.paymentTransactions.push({
            amount: Number(amount),
            date: new Date(),
            paymentMethod,
            transactionId,
            receivedBy: req.user?._id
        });

        if (inst.paidAmount > 0.5 || inst.payableAmount <= 0.5) {
            inst.status = "PAID";
        } else {
            inst.status = "PENDING";
        }

        // --- CASCADE ADJUSTMENTS TO FUTURE MONTHS ---
        let runningBalance = 0;
        let adjustmentApplied = false;

        for (let i = 0; i < admission.installments.length; i++) {
            const current = admission.installments[i];
            const netMonthly = (current.standardAmount || 0) - (current.waiverAmount || 0);

            if (current.monthNumber === 1) {
                current.adjustmentAmount = 0;
            } else {
                // Apply the running balance to the FIRST installment that needs it (unpaid or partially paid)
                if (!adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                    current.adjustmentAmount = -runningBalance;
                    adjustmentApplied = true;
                } else {
                    current.adjustmentAmount = 0;
                }
            }

            // 2. Calculate what SHOULD be payable
            const fullPayable = netMonthly + current.adjustmentAmount;
            current.payableAmount = Math.max(0, fullPayable);

            // 3. Update status
            if (current.paidAmount > 0.5 || (current.payableAmount <= 0.5 && (current.standardAmount || 0) > 0)) {
                current.status = "PAID";
            } else {
                current.status = "PENDING";
            }

            // Carry forward balance if this month has a payment
            if (current.paidAmount > 0.5) {
                runningBalance += (current.paidAmount - netMonthly);
                adjustmentApplied = false; // Allow next month to take the refined balance
            }
        }

        // Recalculate total paid from all installments for accuracy
        admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0);

        // --- Create Payment Record for Billing ---
        try {
            let centreObj = await Centre.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';
            const billId = await generateBillId(centreCode);

            const taxableAmount = Number(amount) / 1.18;
            const cgst = (Number(amount) - taxableAmount) / 2;
            const sgst = cgst;

            const paymentRecord = new Payment({
                admission: admission._id, // Duck-typing for Board Admission
                installmentNumber: inst.monthNumber,
                amount: inst.payableAmount,
                paidAmount: Number(amount),
                dueDate: inst.dueDate,
                paidDate: new Date(),
                receivedDate: new Date(),
                status: inst.status,
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                billingMonth: new Date(inst.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                recordedBy: req.user?._id,
                billId: billId,
                courseFee: taxableAmount,
                cgst: cgst,
                sgst: sgst,
                totalAmount: Number(amount),
                boardCourseName: admission.boardCourseName,
                remarks: `Board Installment Month ${inst.monthNumber}`
            });
            await paymentRecord.save();
        } catch (paymentErr) {
            console.error("Error creating payment record for board admission:", paymentErr);
        }

        await admission.save();

        res.status(200).json({ message: "Payment collected", admission });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message }); console.error("COLLECT ERROR:", error)
    }
};
