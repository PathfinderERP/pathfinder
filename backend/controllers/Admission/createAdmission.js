import Admission from "../../models/Admission/Admission.js";
import Course from "../../models/Master_data/Courses.js";
import Student from "../../models/Students.js";
import Payment from "../../models/Payment/Payment.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Board from "../../models/Master_data/Boards.js"; // Corrected filename
import Subject from "../../models/Master_data/Subject.js"; // Import Subject model
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

export const createAdmission = async (req, res) => {
    try {
        const {
            studentId,
            admissionType = "NORMAL", // Default to normal
            courseId,
            boardId, // For Board Admission
            selectedSubjectIds, // Array of Subject IDs for Board Admission
            classId,
            examTagId,
            departmentId, // Optional now
            centre, // New field
            academicSession,
            downPayment,
            numberOfInstallments,
            studentImage,
            remarks,
            feeWaiver = 0, // Discount amount
            paymentMethod = "CASH", // For down payment
            transactionId = "",
            accountHolderName = "",
            chequeDate = "",
            receivedDate = "",
            billingMonth = "" // For Board Admissions
        } = req.body;

        // Validate required fields (Common)
        if (!studentId || !centre || !academicSession || !downPayment || !numberOfInstallments) {
            return res.status(400).json({ message: "All common required fields must be provided (Student, Centre, Session, Down Payment)" });
        }

        // Validate Type Specific Fields
        if (admissionType === "NORMAL" && (!courseId || !examTagId)) {
            return res.status(400).json({ message: "Course and Exam Tag are required for Normal Admission" });
        }
        if (admissionType === "BOARD" && (!boardId || !selectedSubjectIds || selectedSubjectIds.length === 0 || !billingMonth)) {
            return res.status(400).json({ message: "Board, Subjects, and Billing Month are required for Board Admission" });
        }

        // Fetch student details for carry forward balance
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const previousBalance = student.carryForwardBalance || 0;

        if (student.status === 'Deactivated') {
            return res.status(400).json({ message: "This student is deactivated. New admissions are restricted." });
        }

        let baseFees = 0;
        let feeSnapshot = [];
        let boardCourseNameString = "";
        let selectedSubjectsData = [];
        let course = null;
        let durationMonths = 0; // Initialize durationMonths

        if (admissionType === "NORMAL") {
            // Fetch course details
            course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }
            baseFees = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
            feeSnapshot = course.feesStructure;
            durationMonths = course.courseDurationMonths || 0; // Set duration for normal course
        } else if (admissionType === "BOARD") {
            // Fetch Board with populated subjects
            const board = await Board.findById(boardId).populate("subjects.subjectId");
            if (!board) return res.status(404).json({ message: "Board not found" });

            // Validate and calculate fees based on Board's configuration
            const validSelectedSubjects = [];
            for (const subjectId of selectedSubjectIds) {
                const boardSubject = board.subjects.find(s => {
                    const sId = s.subjectId?._id || s.subjectId;
                    return sId && sId.toString() === subjectId.toString();
                });
                if (boardSubject && boardSubject.subjectId) {
                    validSelectedSubjects.push({
                        _id: boardSubject.subjectId._id || boardSubject.subjectId,
                        subName: boardSubject.subjectId.subName || "Unknown Subject",
                        price: boardSubject.price || 0
                    });
                }
            }

            if (validSelectedSubjects.length !== selectedSubjectIds.length) {
                const missingCount = selectedSubjectIds.length - validSelectedSubjects.length;
                return res.status(400).json({
                    message: `${missingCount} selected subject(s) are not configured for this board. Please refresh and try again.`,
                    received: selectedSubjectIds,
                    valid: validSelectedSubjects.map(v => v._id)
                });
            }

            // Monthly fees calculated (sum of subject prices)
            const monthlyFees = validSelectedSubjects.reduce((sum, sub) => sum + sub.price, 0);

            // Calculate course duration in months from board.duration
            durationMonths = 12; // Default to 12 months
            if (board.duration) {
                const durationStr = board.duration.toLowerCase();
                if (durationStr.includes('month')) {
                    const match = durationStr.match(/\d+/);
                    if (match) durationMonths = parseInt(match[0]);
                } else if (durationStr.includes('year')) {
                    const match = durationStr.match(/\d+/);
                    if (match) durationMonths = parseInt(match[0]) * 12;
                }
            }

            // For Board courses, baseFees is the TOTAL fees (monthly * duration)
            baseFees = monthlyFees * durationMonths;
            feeSnapshot = validSelectedSubjects.map(sub => ({ feesType: sub.subName, value: sub.price }));
            selectedSubjectsData = validSelectedSubjects.map(sub => ({ subject: sub._id, name: sub.subName, price: sub.price }));

            // Construct Name: "BoardName Session Subject1+Subject2..."
            const subNames = validSelectedSubjects.map(s => s.subName).join('+');
            boardCourseNameString = `${board.boardCourse} ${academicSession} ${subNames}`; // Use boardCourse instead of name

            // Store duration and course info helper
            course = { courseDurationMonths: durationMonths, monthlyFees: monthlyFees };
        }

        // Calculate Fees
        const taxableAmount = Math.max(0, baseFees - Number(feeWaiver));

        // Calculate CGST (9%) and SGST (9%)
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);

        // Total Fees = Current + Previous Arrears
        const totalFees = taxableAmount + cgstAmount + sgstAmount + previousBalance;

        const remainingAmount = totalFees - downPayment;

        if (remainingAmount < 0) {
            return res.status(400).json({ message: "Down payment cannot exceed total fees" });
        }

        // For Board courses, calculate monthly payment amount
        let monthlyPaymentAmount = 0;
        if (admissionType === "BOARD" && durationMonths > 0) {
            const monthlyTaxable = baseFees / durationMonths;
            const monthlyCgst = Math.round(monthlyTaxable * 0.09);
            const monthlySgst = Math.round(monthlyTaxable * 0.09);
            monthlyPaymentAmount = monthlyTaxable + monthlyCgst + monthlySgst;
        }

        const installmentAmount = admissionType === "BOARD" ? monthlyPaymentAmount : Math.ceil(remainingAmount / numberOfInstallments);

        // Generate payment breakdown
        const paymentBreakdown = [];
        const currentDate = new Date();

        for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            paymentBreakdown.push({
                installmentNumber: i + 1,
                dueDate: dueDate,
                amount: admissionType === "BOARD" ? monthlyPaymentAmount : (i === numberOfInstallments - 1
                    ? remainingAmount - (installmentAmount * (numberOfInstallments - 1))
                    : installmentAmount),
                status: "PENDING",
                remarks: i === 0 && previousBalance > 0 ? `Includes previous balance: ₹${previousBalance}` : ""
            });
        }

        // Check for existing admission to reuse Admission Number
        const existingAdmission = await Admission.findOne({ student: studentId }).sort({ createdAt: -1 });
        const admissionNumber = existingAdmission ? existingAdmission.admissionNumber : undefined;

        // Initialize monthly subject history for Board admissions
        const monthlyHistory = [];
        if (admissionType === "BOARD" && durationMonths > 0) {
            // Start from the selected billing month or admission date
            const startMonthStr = billingMonth; // e.g. "2026-01"
            const [startYear, startMonth] = startMonthStr.split('-').map(Number);

            for (let i = 0; i < durationMonths; i++) {
                const mDate = new Date(startYear, startMonth - 1 + i, 1);
                const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;

                monthlyHistory.push({
                    month: mKey,
                    subjects: selectedSubjectsData,
                    totalAmount: monthlyPaymentAmount,
                    // The first month is marked as paid/covered by downpayment
                    isPaid: (mKey === startMonthStr && downPayment >= monthlyPaymentAmount)
                });
            }
        }

        // Create admission
        const admission = new Admission({
            student: studentId,
            admissionType,
            admissionNumber, // Reuse if exists, otherwise schema hook generates new
            course: courseId || undefined,
            board: boardId || undefined,
            selectedSubjects: selectedSubjectsData,
            billingMonth: billingMonth || null,
            monthlySubjectHistory: monthlyHistory,
            courseDurationMonths: durationMonths, // Use the calculated durationMonths
            boardCourseName: boardCourseNameString || null,
            class: classId || null,
            examTag: examTagId || undefined,
            department: departmentId || null, // Optional
            centre,
            academicSession,
            baseFees,
            discountAmount: Number(feeWaiver),
            previousBalance, // Store previous balance
            cgstAmount,
            sgstAmount,
            totalFees,
            downPayment,
            remainingAmount,
            numberOfInstallments,
            installmentAmount,
            paymentBreakdown,
            feeStructureSnapshot: feeSnapshot,
            studentImage: studentImage || null,
            remarks: remarks ? `${remarks} (Prev Balance: ₹${previousBalance})` : (previousBalance > 0 ? `Previous Balance Included: ₹${previousBalance}` : ""),
            createdBy: req.user._id,
            totalPaidAmount: downPayment,
            paymentStatus: (downPayment >= totalFees) ? "COMPLETED" : "PARTIAL",
            downPaymentStatus: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
            downPaymentReceivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            downPaymentMethod: paymentMethod,
            downPaymentTransactionId: transactionId,
            downPaymentAccountHolderName: accountHolderName,
            downPaymentChequeDate: chequeDate
        });

        await admission.save();

        // Update student enrollment status and reset carryForwardBalance
        await Student.findByIdAndUpdate(studentId, {
            $set: {
                isEnrolled: true,
                carryForwardBalance: 0
            }
        });

        // Update Centre Target Achieved
        if (downPayment > 0 && centre) {
            updateCentreTargetAchieved(centre, new Date());
        }
        // Create Payment record for Down Payment
        if (downPayment > 0) {
            // Calculate tax breakdown for down payment (pro-rated)
            // For down payment, we treat it as a payment that includes taxes
            // Base amount = Down Payment / 1.18
            const dpBaseAmount = downPayment / 1.18;
            const dpCgst = dpBaseAmount * 0.09;
            const dpSgst = dpBaseAmount * 0.09;
            const dpCourseFee = downPayment - dpCgst - dpSgst;

            // Fetch Centre Info for Bill ID
            let centreObj = await CentreSchema.findOne({ centreName: centre });
            if (!centreObj) {
                centreObj = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            // Generate bill ID for all payment methods (including Cheque) to allow receipt download
            let newBillId = await generateBillId(centreCode);

            const paymentData = {
                admission: admission._id,
                installmentNumber: 0, // 0 for down payment
                amount: downPayment,
                paidAmount: downPayment,
                dueDate: new Date(),
                paidDate: new Date(),
                receivedDate: admission.downPaymentReceivedDate,
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                accountHolderName: accountHolderName,
                chequeDate: chequeDate,
                billingMonth: billingMonth || null,
                boardCourseName: boardCourseNameString || null,
                remarks: "Down Payment at Admission",
                recordedBy: req.user._id,
                // Bill Details
                cgst: parseFloat(dpCgst.toFixed(2)),
                sgst: parseFloat(dpSgst.toFixed(2)),
                courseFee: parseFloat(dpCourseFee.toFixed(2)),
                totalAmount: parseFloat(Number(downPayment).toFixed(2))
            };

            if (newBillId) {
                paymentData.billId = newBillId;
            }

            const payment = new Payment(paymentData);
            await payment.save();
        }

        const populatedAdmission = await Admission.findById(admission._id)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('board') // Populate Board
            .populate('selectedSubjects.subject') // Populate Subjects
            .populate('createdBy', 'name');

        res.status(201).json({
            message: "Admission created successfully",
            admission: populatedAdmission
        });

    } catch (err) {
        console.error("Admission creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
