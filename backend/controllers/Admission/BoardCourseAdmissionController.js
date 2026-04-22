import mongoose from "mongoose";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import Boards from "../../models/Master_data/Boards.js";
import Subject from "../../models/Master_data/Subject.js";
import Students from "../../models/Students.js";
import Payment from "../../models/Payment/Payment.js";
import Centre from "../../models/Master_data/Centre.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import BoardCourseSubject from "../../models/Master_data/BoardCourseSubject.js";
import Class from "../../models/Master_data/Class.js";

// Helper to calculate next months due date
const getNextMonthDate = (startDate, monthsToAdd) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + monthsToAdd);
    return date;
};

export const createBoardAdmission = async (req, res) => {
    try {
        let {
            studentId,
            studentName,
            mobileNum,
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
            transactionId,
            bankName,
            accountHolderName,
            chequeDate,
            admissionFee = 0,
            examFee = 0,
            paidExamFee = 0,
            additionalThingsName = "",
            additionalThingsAmount = 0,
            paidAdditionalThings = 0,
            programme,
            lastClass,
            receivedDate
        } = req.body;

        // Fallback: Fetch student details only if name/mobile/centre not provided
        if (studentId && (!studentName || !mobileNum || !centre)) {
            const student = await Students.findById(studentId);
            if (student && student.studentsDetails?.[0]) {
                const officialDetails = student.studentsDetails[0];
                studentName = studentName || officialDetails.studentName;
                mobileNum = mobileNum || officialDetails.mobileNum;
                centre = centre || officialDetails.centre;
            }
        }

        // Validate Transaction ID for non-cash payments (except Cheque which has its own validation)
        if (downPayment > 0 || paidExamFee > 0 || paidAdditionalThings > 0) {
            if (["ONLINE", "UPI", "BANK_TRANSFER", "CARD"].includes(paymentMethod) && !transactionId) {
                return res.status(400).json({ message: `Transaction ID is mandatory for ${paymentMethod} payments` });
            }
        }



        // 1. Fetch Board and Master Subjects from BoardCourseSubject
        const board = await Boards.findById(boardId);
        if (!board) return res.status(404).json({ message: "Board not found" });

        const classRecord = await Class.findOne({ name: lastClass });
        if (!classRecord) return res.status(404).json({ message: "Target class not found" });

        const masterMapping = await BoardCourseSubject.findOne({ boardId, classId: classRecord._id }).populate('subjects.subjectId');
        if (!masterMapping) return res.status(404).json({ message: "No subjects configured for this board and class" });

        const activeSubjects = masterMapping.subjects.filter(s => {
            const sid = (s.subjectId?._id || s.subjectId)?.toString();
            return selectedSubjectIds.includes(sid);
        });

        if (activeSubjects.length === 0) {
            return res.status(400).json({ message: "No valid subjects selected from master data" });
        }

        const totalSubjectMonthlyFee = (programme === "NCRP") ? 0 : activeSubjects.reduce((sum, s) => sum + s.amount, 0);
        const monthlyWaiver = totalDurationMonths > 0 ? (totalWaiver / totalDurationMonths) : 0;
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
                    subjectId: as.subjectId?._id || as.subjectId,
                    price: (programme === "NCRP") ? 0 : as.amount
                })),
                waiverAmount: monthlyWaiver,
                paidAmount: 0,
                paymentTransactions: []
            };

            const netMonthly = inst.standardAmount - inst.waiverAmount;

            // Month 1 Logic: Always handles Down Payment + Admission Fee
            if (i === 1) {
                inst.paidAmount = downPayment;
                if (downPayment > 0) {
                    inst.paymentTransactions.push({
                        amount: downPayment,
                        date: new Date(),
                        paymentMethod: paymentMethod || "CASH",
                        transactionId: transactionId,

                        bankName: bankName,
                        accountHolderName: accountHolderName,
                        chequeDate: chequeDate,
                        receivedBy: req.user?._id
                    });
                }
                inst.adjustmentAmount = 0;
                // Month 1 payable includes tuition + Admission Fee (Exam fee is separate)
                inst.payableAmount = Math.max(0, netMonthly + Number(admissionFee));
                inst.status = "PAID"; // Locked at admission

                // Balance: What was paid minus what was owed (Tuition + Admission)
                runningBalance += (inst.paidAmount - inst.payableAmount);
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

        // Construct Board Course Name: Board + Class + Programme + Session + Subjects
        const subjectNames = activeSubjects.map(s => (s.subjectId.subName || s.subjectId.name || 'Subject')).join(' + ');
        let boardCourseName = `${board.boardCourse} Class ${lastClass || ''} ${programme || ''} ${academicSession || ''} : ${subjectNames}`;

        if (additionalThingsName && additionalThingsName.trim() !== "") {
            boardCourseName += ` + ${additionalThingsName.trim()}`;
        }


        const newAdmission = new BoardCourseAdmission({
            studentId,
            studentName,
            mobileNum,
            boardId,
            selectedSubjects: activeSubjects.map(s => ({
                subjectId: s.subjectId._id,
                priceAtAdmission: s.amount
            })),
            totalDurationMonths,
            totalWaiver,
            monthlyWaiver,
            billingStartDate,
            academicSession,
            boardCourseName,
            installments,
            admissionFee,
            examFee,
            examFeePaid: Number(paidExamFee),
            examFeeStatus: Number(paidExamFee) >= Number(examFee) && Number(examFee) > 0 ? "PAID" : "PENDING",
            additionalThingsName: additionalThingsName.trim(),
            additionalThingsAmount: Number(additionalThingsAmount),
            additionalThingsPaid: Number(paidAdditionalThings),
            additionalThingsStatus: Number(paidAdditionalThings) >= Number(additionalThingsAmount) && Number(additionalThingsAmount) > 0 ? "PAID" : "PENDING",
            totalExpectedAmount: (expectedMonthly * totalDurationMonths) + Number(admissionFee) + Number(examFee) + Number(additionalThingsAmount),
            totalPaidAmount: Number(downPayment) + Number(paidExamFee) + Number(paidAdditionalThings),
            centre,
            programme,
            lastClass,
            remarks,
            createdBy: req.user?._id
        });

        await newAdmission.save();

        // --- Create Unified Payment Record for Admission/Initial Payment + Exam Fee ---
        const totalPaidToday = Number(downPayment) + Number(paidExamFee) + Number(paidAdditionalThings);
        if (totalPaidToday > 0) {
            try {
                let centreObj = await Centre.findOne({ centreName: centre });
                if (!centreObj) {
                    centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, 'i') } });
                }
                const centreCode = centreObj ? centreObj.enterCode : 'GEN';
                const billId = await generateBillId(centreCode, receivedDate || new Date());

                const taxableAmount = totalPaidToday / 1.18;
                const cgst = (totalPaidToday - taxableAmount) / 2;
                const sgst = cgst;

                // Adjust Course Name for bill: Append "+ Examination" only if exam fee was paid
                const billCourseName = Number(paidExamFee) > 0
                    ? `${boardCourseName} + Examination`
                    : boardCourseName;

                const paymentRecord = new Payment({
                    admission: newAdmission._id,
                    installmentNumber: 0, // First payment is now 0 to match standard
                    amount: installments[0].payableAmount + (Number(paidExamFee) > 0 ? Number(paidExamFee) : 0),
                    paidAmount: totalPaidToday,
                    dueDate: installments[0].dueDate,
                    paidDate: (paymentMethod === "CHEQUE") ? null : new Date(),
                    receivedDate: receivedDate || new Date(),
                    status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                    paymentMethod: paymentMethod || "CASH",
                    transactionId: transactionId,

                    bankName: bankName,
                    accountHolderName: accountHolderName,
                    chequeDate: chequeDate,
                    billingMonth: new Date(installments[0].dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                    recordedBy: req.user?._id,
                    billId: billId,
                    courseFee: taxableAmount,
                    cgst: cgst,
                    sgst: sgst,
                    totalAmount: totalPaidToday,
                    boardCourseName: billCourseName,
                    remarks: `Board Admission Initial Payment (Incl. ${Number(paidExamFee) > 0 ? 'Exam Fee' : 'Tuition'})`
                });
                await paymentRecord.save();
            } catch (pErr) {
                console.error("Error creating unified payment record:", pErr);
            }
        }

        // Update student enrollment status if needed
        await Students.findByIdAndUpdate(studentId, { 
            isEnrolled: true,
            updatedBy: req.user?.name || "System",
            updatedByUserId: req.user?._id
        });

        // Mark board counselling records as ENROLLED
        await BoardCourseCounselling.updateMany(
            { studentId, boardId },
            { status: "ENROLLED" }
        );

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
        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        let query = {};

        if (!isSuperAdmin) {
            // Get centre names for the user's assigned centre IDs
            const centres = await Centre.find({ _id: { $in: req.user.centres } });
            const centreNames = centres.map(c => c.centreName);
            query.centre = { $in: centreNames };
        }

        const admissions = await BoardCourseAdmission.find(query)
            .populate('studentId')
            .populate('boardId')
            .populate('selectedSubjects.subjectId')
            .populate('installments.subjects.subjectId')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json(admissions);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message }); console.error("GET ADMISSIONS ERROR:", error)
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

        // Auto-fix for old records missing name/mobile (avoids validation error on save)
        if (!admission.studentName || !admission.mobileNum) {
            const student = await Students.findById(admission.studentId);
            if (student && student.studentsDetails?.[0]) {
                admission.studentName = admission.studentName || student.studentsDetails[0].studentName;
                admission.mobileNum = admission.mobileNum || student.studentsDetails[0].mobileNum;
            }
        }

        const board = await Boards.findById(admission.boardId);
        const classRecord = await Class.findOne({ name: admission.lastClass });
        const masterMapping = await BoardCourseSubject.findOne({ boardId: admission.boardId, classId: classRecord._id }).populate('subjects.subjectId');

        if (!masterMapping) return res.status(404).json({ message: "Master subjects not found for this board/class" });

        const newActiveSubjects = masterMapping.subjects.filter(s => {
            const sid = (s.subjectId?._id || s.subjectId)?.toString();
            return selectedSubjectIds.includes(sid);
        });

        const newTotalSubjectMonthlyFee = newActiveSubjects.reduce((sum, s) => sum + s.amount, 0);
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
        let runningBalance = 0;
        let adjustmentApplied = false;

        // Recalculate all installments from the beginning to ensure correct balance chain
        for (let i = 0; i < admission.installments.length; i++) {
            const inst = admission.installments[i];

            // Only update subjects/standard fee if we are at or after startMonth
            if (inst.monthNumber >= startMonth) {
                inst.subjects = newActiveSubjects.map(s => ({
                    subjectId: s.subjectId?._id || s.subjectId,
                    price: s.amount
                }));
                inst.standardAmount = newTotalSubjectMonthlyFee;
            }

            const currentNetMonthly = (inst.monthNumber >= startMonth ? newTotalSubjectMonthlyFee : inst.standardAmount) - inst.waiverAmount;

            // Apply running balance adjustment only to the FIRST unpaid/partial month
            if (inst.monthNumber === 1) {
                inst.adjustmentAmount = 0;
            } else {
                if (!adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                    inst.adjustmentAmount = -runningBalance;
                    adjustmentApplied = true;
                } else {
                    inst.adjustmentAmount = 0;
                }
            }

            // Month 1 includes admissionFee
            const extraFees = inst.monthNumber === 1 ? (Number(admission.admissionFee) || 0) : 0;
            const fullPayable = currentNetMonthly + extraFees + inst.adjustmentAmount;
            inst.payableAmount = Math.max(0, fullPayable);

            // Update status based on payment vs new calculation
            if (inst.paidAmount > 0.5 || (inst.payableAmount <= 0.5 && inst.standardAmount > 0)) {
                inst.status = "PAID";
            } else {
                inst.status = "PENDING";
            }

            // Carry forward balance only if month was already paid or handled
            if (inst.paidAmount > 0.5) {
                runningBalance += (inst.paidAmount - (currentNetMonthly + extraFees));
                adjustmentApplied = false; // Reset to allow next month to take the refined balance
            }
        }

        // Update top-level records
        admission.selectedSubjects = newActiveSubjects.map(s => ({
            subjectId: s.subjectId._id,
            priceAtAdmission: s.amount
        }));

        // Refresh dynamic course name if subjects changed
        const subjectNames = newActiveSubjects.map(s => (s.subjectId.subName || s.subjectId.name || 'Subject')).join(' + ');
        admission.boardCourseName = `${board.boardCourse} Class ${admission.lastClass || ''} ${admission.programme || ''} ${admission.academicSession || ''} : ${subjectNames}`;

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

        // Correct totalExpectedAmount calculation: sum of (standard - waiver) for ALL months + one-time fees
        admission.totalExpectedAmount = admission.installments.reduce((sum, inst) =>
            sum + (inst.standardAmount - inst.waiverAmount), 0) + (Number(admission.admissionFee) || 0) + (Number(admission.examFee) || 0);

        // Correct totalPaidAmount calculation: sum of all paid installment amounts + examFeePaid
        admission.totalPaidAmount = admission.installments.reduce((sum, inst) =>
            sum + (inst.paidAmount || 0), 0) + (Number(admission.examFeePaid) || 0);

        await admission.save();
        res.status(200).json({ message: "Subjects updated from month " + startMonth, admission });

    } catch (error) {
        console.error("Update Subjects Error:", error);
        res.status(500).json({ message: "Server error", error: error.message }); console.error("COLLECT ERROR:", error)
    }
};

export const collectBoardExamFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, paymentMethod: rawPaymentMethod, transactionId, bankName, accountHolderName, chequeDate, receivedDate } = req.body;

        const methodMap = { 'ONLINE': 'UPI', 'NEFT': 'BANK_TRANSFER', 'IMPS': 'BANK_TRANSFER', 'RTGS': 'BANK_TRANSFER' };
        const paymentMethod = methodMap[rawPaymentMethod] || rawPaymentMethod;

        const admission = await BoardCourseAdmission.findById(id).populate('studentId');
        if (!admission) return res.status(404).json({ message: "Admission not found" });

        if (["ONLINE", "UPI", "BANK_TRANSFER", "CARD"].includes(paymentMethod) && !transactionId) {
            return res.status(400).json({ message: `Transaction ID is mandatory for ${paymentMethod} payments` });
        }



        if (!admission.studentName || !admission.mobileNum) {
            const student = admission.studentId;
            if (student && student.studentsDetails?.[0]) {
                const details = student.studentsDetails[0];
                admission.studentName = admission.studentName || details.studentName;
                admission.mobileNum = admission.mobileNum || details.mobileNum;
                admission.centre = admission.centre || details.centre;
            }
        }

        const paidAmount = Number(amount);
        admission.examFeePaid += paidAmount;

        if (admission.examFeePaid >= admission.examFee && admission.examFee > 0) {
            admission.examFeeStatus = "PAID";
        } else if (admission.examFeePaid > 0) {
            admission.examFeeStatus = "PARTIAL"; // I'll add this to the enum if needed, but the model has PENDING/PAID. 
        }

        // --- Create Payment Record for Exam Fee ---
        try {
            let centreObj = await Centre.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';
            const billId = await generateBillId(centreCode, receivedDate || new Date());

            const taxableAmount = paidAmount / 1.18;
            const cgst = (paidAmount - taxableAmount) / 2;
            const sgst = cgst;

            const paymentRecord = new Payment({
                admission: admission._id,
                installmentNumber: 0, // Special marker for standalone fees
                amount: admission.examFee,
                paidAmount: paidAmount,
                dueDate: new Date(),
                paidDate: (paymentMethod === "CHEQUE") ? null : new Date(),
                receivedDate: receivedDate || new Date(),
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                bankName: bankName,
                accountHolderName: accountHolderName,
                chequeDate: chequeDate,
                billingMonth: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                recordedBy: req.user?._id || req.user?._id,
                billId: billId,
                courseFee: taxableAmount,
                cgst: cgst,
                sgst: sgst,
                totalAmount: paidAmount,
                boardCourseName: `${admission.boardCourseName || ''} + Examination`,
                remarks: `Board Examination Fee Payment`
            });
            await paymentRecord.save();
        } catch (paymentErr) {
            console.error("Error creating payment record for exam fee:", paymentErr);
        }

        // Update total paid amount
        admission.totalPaidAmount += paidAmount;
        await admission.save();

        res.status(200).json({ message: "Exam fee payment collected", admission });
    } catch (error) {
        console.error("Collect Board Exam Fee Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const collectBoardInstallment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            installmentId,
            amount,
            paidExamFee = 0,
            paidAdditionalThings = 0,
            paymentMethod: rawPaymentMethod,
            transactionId,
            bankName,
            accountHolderName,
            chequeDate,
            receivedDate
        } = req.body;
        // Normalize payment method to match Payment schema enum
        const methodMap = { 'ONLINE': 'UPI', 'NEFT': 'BANK_TRANSFER', 'IMPS': 'BANK_TRANSFER', 'RTGS': 'BANK_TRANSFER' };
        const paymentMethod = methodMap[rawPaymentMethod] || rawPaymentMethod;

        const admission = await BoardCourseAdmission.findById(id).populate('studentId');
        if (!admission) return res.status(404).json({ message: "Admission not found" });

        if (paymentMethod && ["ONLINE", "UPI", "BANK_TRANSFER", "CARD"].includes(paymentMethod) && !transactionId) {
            return res.status(400).json({ message: `Transaction ID/Reference is mandatory for ${paymentMethod} payments` });
        }



        // Safety fallback for legacy records missing required fields
        if (!admission.studentName || !admission.mobileNum) {
            const student = admission.studentId;
            if (student && student.studentsDetails?.[0]) {
                const details = student.studentsDetails[0];
                admission.studentName = admission.studentName || details.studentName;
                admission.mobileNum = admission.mobileNum || details.mobileNum;
                admission.centre = admission.centre || details.centre;
            }
        }

        if (!mongoose.Types.ObjectId.isValid(installmentId)) {
            return res.status(400).json({ message: "Invalid installment ID format" });
        }

        const inst = admission.installments.id(installmentId);
        if (!inst) return res.status(404).json({ message: "Installment not found" });

        inst.paidAmount += Number(amount);
        inst.paymentTransactions.push({
            amount: Number(amount),
            date: receivedDate ? new Date(receivedDate) : new Date(), // This tracks the collection date
            paymentMethod,
            transactionId,
            bankName,
            accountHolderName,
            chequeDate,
            receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            receivedBy: req.user?._id
        });

        if (paymentMethod === "CHEQUE") {
            inst.status = "PENDING"; // Or we could add PENDING_CLEARANCE to the enum if needed
        } else if (inst.paidAmount > 0.5 || inst.payableAmount <= 0.5) {
            inst.status = "PAID";
        } else {
            inst.status = "PENDING";
        }

        // Handle Exam Fee if paid alongside installment
        if (Number(paidExamFee) > 0) {
            admission.examFeePaid += Number(paidExamFee);
            if (admission.examFeePaid >= admission.examFee && admission.examFee > 0) {
                admission.examFeeStatus = "PAID";
            } else if (admission.examFeePaid > 0) {
                admission.examFeeStatus = "PARTIAL";
            }
        }

        // Handle Additional Things if paid alongside installment
        if (Number(paidAdditionalThings) > 0) {
            admission.additionalThingsPaid += Number(paidAdditionalThings);
            if (admission.additionalThingsPaid >= admission.additionalThingsAmount && admission.additionalThingsAmount > 0) {
                admission.additionalThingsStatus = "PAID";
            } else if (admission.additionalThingsPaid > 0) {
                admission.additionalThingsStatus = "PARTIAL";
            }
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
            const extraFees = current.monthNumber === 1 ? (Number(admission.admissionFee) || 0) : 0;
            const fullPayable = netMonthly + extraFees + current.adjustmentAmount;
            current.payableAmount = Math.max(0, fullPayable);

            // 3. Update status
            if (current.paidAmount > 0.5 || (current.payableAmount <= 0.5 && (current.standardAmount || 0) > 0)) {
                current.status = "PAID";
            } else {
                current.status = "PENDING";
            }

            // Carry forward balance if this month has a payment
            if (current.paidAmount > 0.5) {
                runningBalance += (current.paidAmount - (netMonthly + extraFees));
                adjustmentApplied = false; // Allow next month to take the refined balance
            }
        }

        // --- NEW LOIC: Create extra installment if underpaid on the LAST month ---
        if (Math.abs(runningBalance) > 1 && runningBalance < 0) {
            const lastInst = admission.installments[admission.installments.length - 1];
            admission.installments.push({
                monthNumber: (lastInst?.monthNumber || 0) + 1,
                dueDate: lastInst ? getNextMonthDate(lastInst.dueDate, 1) : getNextMonthDate(admission.billingStartDate, admission.installments.length),
                standardAmount: 0,
                subjects: [],
                waiverAmount: 0,
                adjustmentAmount: -runningBalance,
                payableAmount: -runningBalance,
                paidAmount: 0,
                status: "PENDING",
                paymentTransactions: []
            });
            admission.totalDurationMonths = (admission.totalDurationMonths || 0) + 1;
        }

        // Recalculate total paid from all installments + Exam Fees + Additional Things
        admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0) + (admission.additionalThingsPaid || 0);

        // --- Create Payment Record for Billing ---
        try {
            let centreObj = await Centre.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';
            const billId = await generateBillId(centreCode, receivedDate || new Date());

            const totalPaidToday = Number(amount) + Number(paidExamFee) + Number(paidAdditionalThings);
            if (totalPaidToday <= 0) return; // Nothing to record

            const taxableAmount = totalPaidToday / 1.18;
            const cgst = (totalPaidToday - taxableAmount) / 2;
            const sgst = cgst;

            let billCourseName = admission.boardCourseName || '';
            if (Number(paidExamFee) > 0) {
                billCourseName += ' + Examination';
            }
            if (Number(paidAdditionalThings) > 0 && admission.additionalThingsName) {
                billCourseName += ` + ${admission.additionalThingsName}`;
            }

            const paymentRecord = new Payment({
                admission: admission._id,
                installmentNumber: inst.monthNumber - 1,
                amount: inst.payableAmount + (Number(paidExamFee) > 0 ? Number(paidExamFee) : 0) + (Number(paidAdditionalThings) > 0 ? Number(paidAdditionalThings) : 0),
                paidAmount: totalPaidToday,
                dueDate: inst.dueDate,
                paidDate: (paymentMethod === "CHEQUE") ? null : new Date(),
                receivedDate: receivedDate || new Date(),
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : inst.status,
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                bankName: bankName,
                accountHolderName: accountHolderName,
                chequeDate: chequeDate,
                billingMonth: new Date(inst.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                recordedBy: req.user?._id,
                billId: billId,
                courseFee: taxableAmount,
                cgst: cgst,
                sgst: sgst,
                totalAmount: totalPaidToday,
                boardCourseName: billCourseName,
                remarks: `Board Installment Month ${inst.monthNumber} ${Number(paidExamFee) > 0 || Number(paidAdditionalThings) > 0 ? '(Incl. Extra Fees)' : ''}`
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

export const collectBoardAdditionalFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, paymentMethod: rawPaymentMethod, transactionId, bankName, accountHolderName, chequeDate, receivedDate } = req.body;

        const methodMap = { 'ONLINE': 'UPI', 'NEFT': 'BANK_TRANSFER', 'IMPS': 'BANK_TRANSFER', 'RTGS': 'BANK_TRANSFER' };
        const paymentMethod = methodMap[rawPaymentMethod] || rawPaymentMethod;

        const admission = await BoardCourseAdmission.findById(id).populate('studentId');
        if (!admission) return res.status(404).json({ message: "Admission not found" });

        if (["ONLINE", "UPI", "BANK_TRANSFER", "CARD"].includes(paymentMethod) && !transactionId) {
            return res.status(400).json({ message: `Transaction ID is mandatory for ${paymentMethod} payments` });
        }



        if (!admission.studentName || !admission.mobileNum) {
            const student = admission.studentId;
            if (student && student.studentsDetails?.[0]) {
                const details = student.studentsDetails[0];
                admission.studentName = admission.studentName || details.studentName;
                admission.mobileNum = admission.mobileNum || details.mobileNum;
                admission.centre = admission.centre || details.centre;
            }
        }

        const paidAmount = Number(amount);
        admission.additionalThingsPaid += paidAmount;

        if (admission.additionalThingsPaid >= admission.additionalThingsAmount && admission.additionalThingsAmount > 0) {
            admission.additionalThingsStatus = "PAID";
        } else if (admission.additionalThingsPaid > 0) {
            admission.additionalThingsStatus = "PARTIAL";
        }

        // --- Create Payment Record for Additional Fee ---
        try {
            let centreObj = await Centre.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';
            const billId = await generateBillId(centreCode, new Date());

            const taxableAmount = paidAmount / 1.18;
            const cgst = (paidAmount - taxableAmount) / 2;
            const sgst = cgst;

            const paymentRecord = new Payment({
                admission: admission._id,
                installmentNumber: 0, // Special marker for standalone fees
                amount: admission.additionalThingsAmount,
                paidAmount: paidAmount,
                dueDate: new Date(),
                paidDate: new Date(),
                receivedDate: receivedDate || new Date(),
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                bankName: bankName,
                accountHolderName: accountHolderName,
                chequeDate: chequeDate,
                billingMonth: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                recordedBy: req.user?._id,
                billId: billId,
                courseFee: taxableAmount,
                cgst: cgst,
                sgst: sgst,
                totalAmount: paidAmount,
                boardCourseName: `${admission.boardCourseName || ''} + ${admission.additionalThingsName || 'Additional Fee'}`,
                remarks: `Board Additional Fee Payment (${admission.additionalThingsName || 'Additional'})`
            });
            await paymentRecord.save();
        } catch (paymentErr) {
            console.error("Error creating payment record for additional fee:", paymentErr);
        }

        admission.totalPaidAmount += paidAmount;
        await admission.save();

        res.status(200).json({ message: "Additional fee payment collected", admission });
    } catch (error) {
        console.error("Collect Board Additional Fee Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// NCRP: Collect Exam Fee + Additional Fee together in ONE bill
export const collectNcrpFees = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            paidExamFee = 0,
            paidAdditionalThings = 0,
            paymentMethod: rawPaymentMethod,
            transactionId,
            bankName,
            accountHolderName,
            chequeDate,
            receivedDate
        } = req.body;

        const methodMap = { 'ONLINE': 'UPI', 'NEFT': 'BANK_TRANSFER', 'IMPS': 'BANK_TRANSFER', 'RTGS': 'BANK_TRANSFER' };
        const paymentMethod = methodMap[rawPaymentMethod] || rawPaymentMethod;

        const admission = await BoardCourseAdmission.findById(id).populate('studentId');
        if (!admission) return res.status(404).json({ message: "Admission not found" });

        if (!admission.studentName || !admission.mobileNum) {
            const student = admission.studentId;
            if (student && student.studentsDetails?.[0]) {
                const details = student.studentsDetails[0];
                admission.studentName = admission.studentName || details.studentName;
                admission.mobileNum = admission.mobileNum || details.mobileNum;
                admission.centre = admission.centre || details.centre;
            }
        }

        const examPaid = Number(paidExamFee) || 0;
        const additionalPaid = Number(paidAdditionalThings) || 0;
        const totalPaidToday = examPaid + additionalPaid;

        if (totalPaidToday <= 0) return res.status(400).json({ message: "No payment amount specified" });

        // Update Exam Fee
        if (examPaid > 0) {
            admission.examFeePaid = (admission.examFeePaid || 0) + examPaid;
            if (admission.examFeePaid >= admission.examFee && admission.examFee > 0) {
                admission.examFeeStatus = "PAID";
            } else {
                admission.examFeeStatus = "PARTIAL";
            }
        }

        // Update Additional Fee
        if (additionalPaid > 0) {
            admission.additionalThingsPaid = (admission.additionalThingsPaid || 0) + additionalPaid;
            if (admission.additionalThingsPaid >= admission.additionalThingsAmount && admission.additionalThingsAmount > 0) {
                admission.additionalThingsStatus = "PAID";
            } else {
                admission.additionalThingsStatus = "PARTIAL";
            }
        }

        // Create ONE combined payment record with a single bill
        try {
            let centreObj = await Centre.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';
            const billId = await generateBillId(centreCode, new Date());

            const taxableAmount = totalPaidToday / 1.18;
            const cgst = (totalPaidToday - taxableAmount) / 2;
            const sgst = cgst;

            let billCourseName = admission.boardCourseName || '';
            if (examPaid > 0) billCourseName += ' + Examination';
            if (additionalPaid > 0 && admission.additionalThingsName) billCourseName += ` + ${admission.additionalThingsName}`;

            const parts = [];
            if (examPaid > 0) parts.push(`Exam Fee ₹${examPaid}`);
            if (additionalPaid > 0) parts.push(`${admission.additionalThingsName || 'Additional Fee'} ₹${additionalPaid}`);
            const remarks = `NCRP Fee Payment: ${parts.join(' + ')}`;

            const paymentRecord = new Payment({
                admission: admission._id,
                installmentNumber: 0,
                amount: totalPaidToday,
                paidAmount: totalPaidToday,
                dueDate: new Date(),
                paidDate: new Date(),
                receivedDate: receivedDate || new Date(),
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                paymentMethod,
                transactionId,
                bankName,
                accountHolderName,
                chequeDate,
                billingMonth: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                recordedBy: req.user?._id,
                billId,
                courseFee: taxableAmount,
                cgst,
                sgst,
                totalAmount: totalPaidToday,
                boardCourseName: billCourseName,
                remarks
            });
            await paymentRecord.save();
        } catch (paymentErr) {
            console.error("Error creating NCRP payment record:", paymentErr);
        }

        admission.totalPaidAmount = (admission.totalPaidAmount || 0) + totalPaidToday;
        await admission.save();

        res.status(200).json({ message: "NCRP fee payment collected successfully", admission });
    } catch (error) {
        console.error("Collect NCRP Fees Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getBoardAdmissionAnalysis = async (req, res) => {
    try {
        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        let match = {};

        // 1. Role-based filtering
        if (!isSuperAdmin) {
            const centres = await Centre.find({ _id: { $in: req.user.centres } });
            const centreNames = centres.map(c => c.centreName);
            match.centre = { $in: centreNames };
        }

        // 2. Query-based filtering (explicit centre selection)
        if (req.query.centre) {
            match.centre = req.query.centre;
        }

        // 3. Aggregate Data
        const stats = await BoardCourseAdmission.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalAdmissions: { $sum: 1 },
                    totalExpected: { $sum: "$totalExpectedAmount" },
                    totalPaid: { $sum: "$totalPaidAmount" },
                    totalWaiver: { $sum: "$totalWaiver" }
                }
            }
        ]);

        const centreStats = await BoardCourseAdmission.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$centre",
                    count: { $sum: 1 },
                    expected: { $sum: "$totalExpectedAmount" },
                    paid: { $sum: "$totalPaidAmount" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const boardStats = await BoardCourseAdmission.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: "boards",
                    localField: "boardId",
                    foreignField: "_id",
                    as: "boardInfo"
                }
            },
            { $unwind: "$boardInfo" },
            {
                $group: {
                    _id: "$boardInfo.boardCourse",
                    count: { $sum: 1 },
                    expected: { $sum: "$totalExpectedAmount" },
                    paid: { $sum: "$totalPaidAmount" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const monthlyStats = await BoardCourseAdmission.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    count: { $sum: 1 },
                    expected: { $sum: "$totalExpectedAmount" },
                    paid: { $sum: "$totalPaidAmount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        res.status(200).json({
            success: true,
            overview: stats[0] || { totalAdmissions: 0, totalExpected: 0, totalPaid: 0, totalWaiver: 0 },
            byCentre: centreStats,
            byBoard: boardStats,
            byMonth: monthlyStats
        });
    } catch (error) {
        console.error("Board Analysis Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

