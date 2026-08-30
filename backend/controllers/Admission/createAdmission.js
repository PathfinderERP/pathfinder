import Admission from "../../models/Admission/Admission.js";
import Course from "../../models/Master_data/Courses.js";
import Student from "../../models/Students.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Payment from "../../models/Payment/Payment.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import Board from "../../models/Master_data/Boards.js"; // Corrected filename
import Subject from "../../models/Master_data/Subject.js"; // Import Subject model
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";
import { isGstExempt } from "../../utils/gstHelper.js";
import { rebalanceBoardHistory } from "./generateMonthlyBill.js";
import { clearCachePattern } from "../../utils/redisCache.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Batch from "../../models/Master_data/Batch.js";
import Class from "../../models/Master_data/Class.js";
import Department from "../../models/Master_data/Department.js";
import Account from "../../models/Master_data/Account.js";

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
            bankName = "",
            accountHolderName = "",
            chequeDate = "",
            receivedDate = "",
            billingMonth = "", // For Board Admissions
            customBoardDuration = "", // New: Custom duration override
            bankAccount = null,
            admittedBy,
            programme,
            batchId,
            batches
        } = req.body;

        if (!admittedBy) {
            return res.status(400).json({ message: "Admitted by selection is required" });
        }

        // Validate required fields (Common)
        if (!studentId || !centre || !academicSession || (downPayment === undefined) || (numberOfInstallments === undefined)) {
            return res.status(400).json({ message: "All common required fields must be provided (Student, Centre, Session, Down Payment, Installments)" });
        }

        // Validate Transaction ID for non-cash payments (except Cheque which has its own validation)
        if (Number(downPayment) > 0) {
            if (paymentMethod === "CHEQUE" && !bankAccount) {
                return res.status(400).json({ message: "Bank Account is required for Cheque down payments" });
            }
            if (["ONLINE", "UPI", "BANK_TRANSFER", "CARD"].includes(paymentMethod) && !transactionId) {
                return res.status(400).json({ message: `Transaction ID is mandatory for ${paymentMethod} payments` });
            }

        }


        // Validate Type Specific Fields
        if (admissionType === "NORMAL" && (!courseId || !examTagId || !departmentId)) {
            return res.status(400).json({ message: "Course, Exam Tag, and Department are required for Normal Admission" });
        }
        if (admissionType === "BOARD" && (!boardId || !selectedSubjectIds || selectedSubjectIds.length === 0 || !billingMonth || !examTagId || !departmentId)) {
            return res.status(400).json({ message: "Board, Subjects, Billing Month, Exam Tag, and Department are required for Board Admission" });
        }

        // Fetch student details for carry forward balance
        let student = await Student.findById(studentId).populate('batches');
        if (!student) {
            const [PNTSEStudent, PMOStudent] = await Promise.all([
                import("../../models/PNTSEStudent.js").then(m => m.default),
                import("../../models/PMOStudent.js").then(m => m.default)
            ]);
            const [pntse, pmo] = await Promise.all([
                PNTSEStudent.findById(studentId).populate('centre', 'centreName').populate('class', 'name').lean(),
                PMOStudent.findById(studentId).populate('centre', 'centreName').populate('class', 'name').lean()
            ]);
            const doc = pntse || pmo;
            if (doc) {
                if (doc.studentId && mongoose.Types.ObjectId.isValid(doc.studentId)) {
                    student = await Student.findById(doc.studentId).populate('batches');
                }
                if (!student) {
                    const newStudent = new Student({
                        _id: mongoose.Types.ObjectId.isValid(studentId) ? studentId : new mongoose.Types.ObjectId(),
                        studentsDetails: [{
                            studentName: doc.name,
                            mobileNum: doc.mobile,
                            whatsappNumber: doc.secondaryMobile || doc.mobile,
                            studentEmail: doc.email || "",
                            centre: doc.centre?.centreName || (typeof doc.centre === 'string' ? doc.centre : centre || ""),
                            programme: programme || "CRP"
                        }],
                        status: 'Active',
                        isEnrolled: true
                    });
                    student = await newStudent.save();

                    if (pntse) {
                        await PNTSEStudent.findByIdAndUpdate(doc._id, { studentId: student._id });
                    } else if (pmo) {
                        await PMOStudent.findByIdAndUpdate(doc._id, { studentId: student._id });
                    }
                }
            }
        }

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const finalProg = programme || student.studentsDetails?.[0]?.programme || "CRP";
        if (finalProg === "CRP" && !batchId && (!batches || batches.length === 0) && (!student.batches || student.batches.length === 0)) {
            return res.status(400).json({ message: "Batch selection is mandatory for CRP programme." });
        }

        const previousBalance = student.carryForwardBalance || 0;

        if (student.status === 'Deactivated') {
            const deactivationDate = student.deactivationDate;
            const now = new Date();
            const daysDeactivated = deactivationDate
                ? Math.floor((now - new Date(deactivationDate)) / (1000 * 60 * 60 * 24))
                : 0;

            if (daysDeactivated > 0) {
                // Shift Normal Admissions
                const normalAdmissions = await Admission.find({ student: studentId });
                for (const adm of normalAdmissions) {
                    adm.paymentBreakdown.forEach(p => {
                        if (p.status === 'PENDING' || p.status === 'OVERDUE') {
                            const currentDue = new Date(p.dueDate);
                            currentDue.setDate(currentDue.getDate() + daysDeactivated);
                            p.dueDate = currentDue;
                        }
                    });
                    await adm.save();
                }

                // Shift Board Admissions
                const boardAdmissions = await BoardCourseAdmission.find({ studentId: studentId });
                for (const bAdm of boardAdmissions) {
                    bAdm.installments.forEach(inst => {
                        if (inst.status === 'PENDING' || inst.status === 'OVERDUE') {
                            const currentDue = new Date(inst.dueDate);
                            currentDue.setDate(currentDue.getDate() + daysDeactivated);
                            inst.dueDate = currentDue;
                        }
                    });
                    await bAdm.save();
                }
            }

            student.status = 'Active';
            student.deactivationDate = null;
            student.deactivatedBy = null;
            student.deactivatedByUserId = null;
            await student.save();
        }

        let baseFees = 0;
        let feeSnapshot = [];
        let durationMonths = 0;
        let board = null;
        let course = null;
        let selectedSubjectsData = [];
        let boardCourseNameString = "";

        if (admissionType === "NORMAL") {
            course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: "Course not found" });
            }

            // Normal Course Duration & Fees
            durationMonths = 12;
            if (course.courseDuration) {
                const durStr = course.courseDuration.toLowerCase();
                if (durStr.includes('year')) {
                    const match = durStr.match(/\d+/);
                    durationMonths = (match ? parseInt(match[0]) : 1) * 12;
                } else if (durStr.includes('month')) {
                    const match = durStr.match(/\d+/);
                    durationMonths = match ? parseInt(match[0]) : 12;
                } else {
                    durationMonths = parseInt(durStr) || 12;
                }
            } else if (course.courseDurationMonths) {
                durationMonths = Number(course.courseDurationMonths) || 12;
            }

            if (Array.isArray(course.feesStructure) && course.feesStructure.length > 0) {
                baseFees = course.feesStructure.reduce((sum, fee) => sum + (Number(fee.value) || 0), 0);
            } else if (course.courseFee !== undefined && course.courseFee !== null) {
                baseFees = Number(course.courseFee) || 0;
            } else if (req.body.baseFees !== undefined && req.body.baseFees !== null) {
                baseFees = Number(req.body.baseFees) || 0;
            } else {
                baseFees = 0;
            }

            feeSnapshot = (course.feesStructure && course.feesStructure.length > 0)
                ? course.feesStructure.map(f => ({
                    feesType: f.feesType,
                    value: Number(f.value) || 0,
                    discount: f.discount || "0"
                }))
                : (course.feeStructure || []);
        } else if (admissionType === "BOARD") {
            board = await Board.findById(boardId).populate("subjects.subjectId");
            if (!board) {
                return res.status(404).json({ message: "Board not found" });
            }

            // Parse Duration String (e.g., "1 Year", "6 Months", "12")
            durationMonths = parseInt(board.duration) || 12;
            if (board.duration && board.duration.toLowerCase().includes("year")) {
                durationMonths = (parseInt(board.duration) || 1) * 12;
            }

            // Validate and fetch price for each selected subject
            const validSelectedSubjects = [];
            let monthlyFees = 0;

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
                    monthlyFees += boardSubject.price || 0;
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
            monthlyFees = validSelectedSubjects.reduce((sum, sub) => sum + sub.price, 0);

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

            // Override duration with custom value if provided
            const manualDur = parseInt(customBoardDuration);
            if (!isNaN(manualDur) && manualDur > 0) {
                durationMonths = manualDur;
            }

            // For Board courses, baseFees is the TOTAL fees (monthly * duration)
            baseFees = monthlyFees * durationMonths;
            feeSnapshot = validSelectedSubjects.map(sub => ({ feesType: sub.subName, value: sub.price }));
            selectedSubjectsData = validSelectedSubjects.map(sub => ({ subject: sub._id, name: sub.subName, price: sub.price }));

            // Construct Name: "BoardName Session Subject1+Subject2..."
            const subNames = validSelectedSubjects.map(s => s.subName).join(' + ');
            boardCourseNameString = `${board.boardCourse} ${academicSession} : ${subNames}`;

            // Store duration and course info helper
            course = { courseDurationMonths: durationMonths, monthlyFees: monthlyFees };
        }

        const exempt = isGstExempt({
            centreName: centre,
            boardName: board?.boardCourse || boardCourseNameString,
            student: student,
            batches: batches || student?.batches,
            programme: programme
        });

        // Coerce inputs to numbers safely
        baseFees = Number(baseFees) || 0;
        const parsedFeeWaiver = Number(feeWaiver) || 0;
        const parsedDownPayment = Number(downPayment) || 0;
        const parsedNumberOfInstallments = Number(numberOfInstallments) || 0;

        // Calculate Fees (Inclusive Deduction)
        const totalInclusiveBeforeWaiver = exempt ? baseFees : baseFees * 1.18;
        const totalFees = parseFloat(Math.max(0, (totalInclusiveBeforeWaiver - parsedFeeWaiver + previousBalance)).toFixed(3));

        // Back-calculate taxable and GST (excluding previous balance)
        const totalForGst = Math.max(0, totalFees - previousBalance);
        const taxableAmount = exempt ? totalForGst : parseFloat((totalForGst / 1.18).toFixed(3));
        const cgstAmount = exempt ? 0 : parseFloat((taxableAmount * 0.09).toFixed(3));
        const sgstAmount = exempt ? 0 : parseFloat((taxableAmount * 0.09).toFixed(3));

        const remainingAmount = parseFloat(Math.max(0, totalFees - parsedDownPayment).toFixed(3));

        // Use Math.ceil tolerance: allow down payment up to the ceiling of totalFees
        // to prevent false rejection when user pays exactly what the frontend showed.
        if (parsedDownPayment > Math.ceil(totalFees)) {
            return res.status(400).json({ message: "Down payment cannot exceed total fees" });
        }

        // For Board courses, calculate monthly payment amount
        let monthlyPaymentAmount = 0;
        if (admissionType === "BOARD" && durationMonths > 0) {
            const monthlyTaxable = baseFees / durationMonths;
            const monthlyCgst = exempt ? 0 : Math.round(monthlyTaxable * 0.09);
            const monthlySgst = exempt ? 0 : Math.round(monthlyTaxable * 0.09);
            monthlyPaymentAmount = Math.round(monthlyTaxable + monthlyCgst + monthlySgst);
        }

        const installmentAmount = admissionType === "BOARD"
            ? monthlyPaymentAmount
            : (parsedNumberOfInstallments > 0 ? Math.ceil(remainingAmount / parsedNumberOfInstallments) : 0);

        // Generate payment breakdown
        const paymentBreakdown = [];
        const currentDate = new Date();
        let remainingToDistribute = Math.max(0, remainingAmount);

        for (let i = 0; i < parsedNumberOfInstallments; i++) {
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            let amount = 0;
            if (admissionType === "BOARD") {
                amount = Math.max(0, Math.min(monthlyPaymentAmount, remainingToDistribute));
            } else {
                if (i === parsedNumberOfInstallments - 1) {
                    amount = Math.max(0, remainingToDistribute);
                } else {
                    amount = Math.max(0, Math.min(installmentAmount, remainingToDistribute));
                }
            }
            amount = Number(amount) || 0;
            remainingToDistribute = parseFloat(Math.max(0, (remainingToDistribute - amount)).toFixed(3));

            paymentBreakdown.push({
                installmentNumber: i + 1,
                dueDate: dueDate,
                amount: amount,
                status: "PENDING",
                remarks: i === 0 && previousBalance > 0 ? `Includes previous balance: ₹${previousBalance}` : ""
            });
        }

        let admissionNumber = req.body.admissionNumber || undefined;

        // Initialize monthly subject history for Board admissions
        const monthlyHistory = [];
        if (admissionType === "BOARD" && durationMonths > 0) {
            const startMonthStr = billingMonth; // e.g. "2026-01"
            const [startYear, startMonth] = startMonthStr.split('-').map(Number);

            for (let i = 0; i < durationMonths; i++) {
                const mDate = new Date(startYear, startMonth - 1 + i, 1);
                const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;

                monthlyHistory.push({
                    month: mKey,
                    subjects: selectedSubjectsData,
                    totalAmount: monthlyPaymentAmount,
                    status: "PENDING"
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
            programme: programme || student.studentsDetails?.[0]?.programme || "CRP",
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
            createdBy: admittedBy || req.user._id,
            totalPaidAmount: downPayment,
            paymentStatus: (downPayment >= totalFees) ? "COMPLETED" : "PARTIAL",
            downPaymentStatus: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
            downPaymentReceivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            downPaymentMethod: paymentMethod,
            downPaymentTransactionId: transactionId,
            downPaymentBankName: bankName,
            accountHolderName: accountHolderName,
            chequeDate: chequeDate,
            downPaymentBankAccount: (bankAccount && bankAccount !== "") ? bankAccount : undefined
        });

        await admission.save();

        // Resolve ExamTag name for student profile tagging
        let examTagName = "";
        if (examTagId) {
            const tagDoc = await ExamTag.findById(examTagId);
            if (tagDoc) examTagName = tagDoc.name;
        }

        // Update student enrollment status, batches, programme, and reset carryForwardBalance
        const studentUpdatePayload = {
            isEnrolled: true,
            carryForwardBalance: 0,
            updatedBy: req.user?.name || "System",
            updatedByUserId: req.user?._id,
            department: departmentId || student.department
        };

        const updatedStudentsDetails = student.studentsDetails ? JSON.parse(JSON.stringify(student.studentsDetails)) : [];
        if (updatedStudentsDetails.length > 0) {
            if (admission.admissionNumber) {
                studentUpdatePayload.admissionNumber = admission.admissionNumber;
                updatedStudentsDetails[0].rollNo = admission.admissionNumber;
                updatedStudentsDetails[0].admissionNumber = admission.admissionNumber;
            }
            if (boardId) {
                const boardDoc = await Board.findById(boardId);
                if (boardDoc) {
                    updatedStudentsDetails[0].board = boardDoc.boardCourse || boardDoc.boardName || "WBCHSE";
                    studentUpdatePayload.board = boardDoc._id;
                }
            }
            if (programme) {
                updatedStudentsDetails[0].programme = programme;
            }
            studentUpdatePayload.studentsDetails = updatedStudentsDetails;
        } else if (admission.admissionNumber) {
            studentUpdatePayload.admissionNumber = admission.admissionNumber;
        }

        if (batchId) {
            studentUpdatePayload.batches = [batchId];
        } else if (Array.isArray(batches) && batches.length > 0) {
            studentUpdatePayload.batches = batches;
        }

        if (examTagName) {
            studentUpdatePayload.sessionExamCourse = [{
                examTag: examTagName,
                session: academicSession || student.sessionExamCourse?.[0]?.session || "",
                targetExams: student.sessionExamCourse?.[0]?.targetExams || ""
            }];
        } else if (academicSession) {
            studentUpdatePayload.sessionExamCourse = [{
                examTag: student.sessionExamCourse?.[0]?.examTag || "",
                session: academicSession,
                targetExams: student.sessionExamCourse?.[0]?.targetExams || ""
            }];
        }

        await Student.findByIdAndUpdate(studentId, {
            $set: studentUpdatePayload
        });

        // Mark matching leads as counselled/admitted (so they move out of All Leads)
        try {
            const LeadManagement = (await import("../../models/LeadManagement.js")).default;
            const mobileNum = student.studentsDetails?.[0]?.mobileNum;
            const whatsappNumber = student.studentsDetails?.[0]?.whatsappNumber;
            const queryPhones = [mobileNum, whatsappNumber].filter(p => p && p !== '-');
            if (queryPhones.length > 0) {
                await LeadManagement.updateMany(
                    {
                        $or: [
                            { phoneNumber: { $in: queryPhones } },
                            { secondPhoneNumber: { $in: queryPhones } }
                        ]
                    },
                    { $set: { isCounseled: true } }
                );
            }
        } catch (leadErr) {
            console.error("Error marking matching leads as counselled on admission:", leadErr);
        }

        // Update Centre Target Achieved
        if (downPayment > 0 && centre) {
            updateCentreTargetAchieved(centre, new Date());
        }
        // Create Payment record for Down Payment
        if (downPayment > 0) {
            // Calculate tax breakdown for down payment (pro-rated)
            // For down payment, we treat it as a payment that includes taxes
            // Base amount = Down Payment / 1.18 (or Down Payment if exempt)
            const dpBaseAmount = exempt ? downPayment : downPayment / 1.18;
            const dpCgst = exempt ? 0 : dpBaseAmount * 0.09;
            const dpSgst = exempt ? 0 : dpBaseAmount * 0.09;
            const dpCourseFee = downPayment - dpCgst - dpSgst;

            // Fetch Centre Info for Bill ID
            let centreObj = await CentreSchema.findOne({ centreName: centre });
            if (!centreObj) {
                centreObj = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            // Generate bill ID for all payment methods (including Cheque) to allow receipt download
            let newBillId = await generateBillId(centreCode, admission.downPaymentReceivedDate);

            const paymentData = {
                admission: admission._id,
                installmentNumber: 0, // 0 for down payment
                amount: downPayment,
                paidAmount: downPayment,
                dueDate: new Date(),
                paidDate: (paymentMethod === "CHEQUE") ? null : new Date(),
                receivedDate: admission.downPaymentReceivedDate,
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                bankName: bankName,
                accountHolderName: accountHolderName,
                chequeDate: chequeDate,
                bankAccount: (bankAccount && bankAccount !== "") ? bankAccount : undefined,
                billingMonth: billingMonth || null,
                boardCourseName: boardCourseNameString || null,
                remarks: "Down Payment at Admission",
                recordedBy: req.user._id,
                centre: centre,
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

        if (admission.admissionType === "BOARD") {
            await rebalanceBoardHistory(admission._id);
        }

        // Invalidate admissions list and finance report cache
        await clearCachePattern("admissions:list:*");
        await clearCachePattern("finance:transaction_report:*");

        const populatedAdmission = await Admission.findById(admission._id)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('board') // Populate Board
            .populate('selectedSubjects.subject') // Populate Subjects
            .populate('createdBy', 'name')
            .populate({
                path: 'downPaymentBankAccount',
                model: 'Account'
            })
            .populate({
                path: 'paymentBreakdown.bankAccount',
                model: 'Account'
            });

        res.status(201).json({
            message: "Admission created successfully",
            admission: populatedAdmission
        });

    } catch (err) {
        console.error("Admission creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
