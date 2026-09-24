import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Course from "../../models/Master_data/Courses.js";
import Class from "../../models/Master_data/Class.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Department from "../../models/Master_data/Department.js";
import Boards from "../../models/Master_data/Boards.js";
import Allocation from "../../models/Inventory/Allocation.js";
import Account from "../../models/Master_data/Account.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import { isGstExempt } from "../../utils/gstHelper.js";


// Generate a random GST-like number
const generateGSTNumber = () => {
    const stateCode = "19"; // West Bengal code (example)
    const pan = Math.random().toString(36).substring(2, 7).toUpperCase() +
        Math.floor(1000 + Math.random() * 9000) +
        Math.random().toString(36).substring(2, 3).toUpperCase();
    const entityNumber = "1";
    const z = "Z";
    const checkSum = Math.floor(Math.random() * 10);
    return `${stateCode}${pan}${entityNumber}${z}${checkSum}`;
};

// Generate bill for a payment
const activeGenerations = new Map();

// Helper to resolve bank account details for a payment
const resolveBankAccountDetails = async (payment, admission, installmentNum, isBoardAdmission) => {
    let accountId = payment?.bankAccount;

    if (!accountId && admission) {
        if (installmentNum === 0) {
            accountId = admission.downPaymentBankAccount || admission.paymentBreakdown?.[0]?.bankAccount || admission.bankAccount;
        } else if (!isBoardAdmission && admission.paymentBreakdown) {
            const inst = admission.paymentBreakdown.find(p => p.installmentNumber === installmentNum);
            accountId = inst?.bankAccount;
        } else if (isBoardAdmission && admission.installments) {
            const bInst = admission.installments.find(i => i.monthNumber === installmentNum || i.monthNumber === (installmentNum + 1) || i._id?.toString() === String(installmentNum));
            const lastTx = bInst?.paymentTransactions?.[bInst.paymentTransactions?.length - 1];
            accountId = lastTx?.bankAccount || bInst?.bankAccount;
        }
    }

    if (!accountId) return null;

    if (typeof accountId === 'object' && accountId.accname) {
        return {
            _id: accountId._id,
            accname: accountId.accname,
            accno: accountId.accno,
            label: accountId.accno ? `${accountId.accname.toUpperCase()} (A/C: ${accountId.accno})` : accountId.accname.toUpperCase()
        };
    }

    try {
        const acc = await Account.findById(accountId).lean();
        if (acc) {
            return {
                _id: acc._id,
                accname: acc.accname,
                accno: acc.accno,
                label: acc.accno ? `${acc.accname.toUpperCase()} (A/C: ${acc.accno})` : acc.accname.toUpperCase()
            };
        }
    } catch (err) {
        console.error("Error resolving bank account:", err);
    }
    return null;
};

export const generateBill = async (req, res) => {
    const { admissionId, installmentNumber } = req.params;
    const { billingMonth, billId: queryBillId } = req.query;
    const lockKey = `${admissionId}:${installmentNumber}:${billingMonth || ''}`;

    if (activeGenerations.has(lockKey)) {
        console.log(`🌀 Request Collapsing: Awaiting active bill generation for ${lockKey}`);
        try {
            const result = await activeGenerations.get(lockKey);
            return res.status(result.status).json(result.data);
        } catch (err) {
            return res.status(500).json({ message: "Server error during concurrent bill generation", error: err.message });
        }
    }

    const generatePromise = (async () => {
        try {
            const installmentNum = parseInt(installmentNumber);

            // Find the admission - Try standard first, then Board
            let admission = await Admission.findById(admissionId)
                .populate({
                    path: 'student',
                    populate: [
                        { path: 'department' },
                        { path: 'batches', select: 'batchName' }
                    ]
                })
                .populate('course')
                .populate('board')
                .populate('department')
                .populate('examTag')
                .populate('class');

            let isBoardAdmission = false;

            if (!admission) {
                admission = await BoardCourseAdmission.findById(admissionId)
                    .populate({
                        path: 'studentId',
                        populate: [
                            { path: 'department' },
                            { path: 'batches', select: 'batchName' }
                        ]
                    })
                    .populate('boardId')
                    .populate('department')
                    .populate('examTag');
                if (admission) {
                    isBoardAdmission = true;
                    // Normalize Board Admission fields to match logic below
                    admission.student = admission.studentId;
                    admission.centre = admission.centre || "General";
                    admission.boardCourseName = admission.boardCourseName || (admission.boardId?.boardCourse || "Board Course");
                    admission.academicSession = admission.academicSession || "N/A";
                    admission.admissionNumber = admission.admissionNumber || "PENDING";
                }
            }

            if (!admission) {
                console.error(`❌ Admission not found: ${admissionId}`);
                return { status: 404, data: { message: "Admission not found" } };
            }

            // Fetch centre information (Try exact match first, then case-insensitive)
            let centre = await CentreSchema.findOne({ centreName: admission.centre });

            if (!centre) {
                // Try case-insensitive search
                centre = await CentreSchema.findOne({
                    centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') }
                });
            }

            if (!centre) {
                console.warn(`⚠️ Centre not found: ${admission.centre}. Using default centre info.`);
                // Fallback to default centre info instead of failing
                centre = {
                    centreName: admission.centre,
                    enterCode: 'GEN',
                    address: '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                    phoneNumber: '033 2455-1840 / 2454-4817 / 4668',
                    enterGstNo: 'N/A',
                    enterCorporateOfficeAddress: '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                    enterCorporateOfficePhoneNumber: '033 2455-1840 / 2454-4817 / 4668'
                };
            }

            let installment;
            let isDownPayment = false;

            const isBoardType = isBoardAdmission || admission.admissionType === 'BOARD';

            if (isBoardType) {
                // Priority 1: Check for a direct match in installments (could be 0-indexed or 1-indexed)
                installment = (admission.installments || []).find(i => i.monthNumber === installmentNum);
                
                // Priority 2: If not found, try the 0-indexed mapping (installment 0 -> month 1)
                if (!installment) {
                    installment = (admission.installments || []).find(i => i.monthNumber === installmentNum + 1);
                }

                // Fallback for standalone board exam fees (always 0)
                if (!installment && installmentNum === 0) {
                    isDownPayment = true;
                    installment = {
                        installmentNumber: 0,
                        amount: admission.examFee || 0,
                        paidAmount: admission.examFeePaid || 0,
                        dueDate: admission.admissionDate,
                        paidDate: admission.admissionDate,
                        status: (admission.examFeeStatus === "PAID" || admission.examFeePaid > 0) ? "PAID" : "PENDING",
                        paymentMethod: "CASH",
                        remarks: "Board Examination Fee"
                    };
                }
            } else if (installmentNum === 0) {
                // Standard Admission Down Payment
                isDownPayment = true;
                installment = {
                    installmentNumber: 0,
                    amount: admission.downPayment,
                    paidAmount: admission.downPayment,
                    dueDate: admission.admissionDate,
                    paidDate: admission.admissionDate,
                    status: (admission.downPaymentStatus === "PENDING_CLEARANCE") ? "PENDING_CLEARANCE" : "PAID",
                    paymentMethod: "CASH",
                    remarks: "Down Payment at Admission"
                };
            } else {
                installment = admission.paymentBreakdown.find(
                    p => p.installmentNumber === installmentNum
                );
            }

            if (!installment) {
                console.error(`❌ Installment #${installmentNum} not found in admission ${admissionId}. Type: ${admission.admissionType}`);
                return { status: 404, data: { message: "Installment not found" } };
            }

            // --- STATUS VALIDATION RELAXATION ---
            // RELAXATION: If a Payment record ALREADY EXISTS, we should allow printing 
            // even if the Admission record's status hasn't synced (Self-healing).
            // Since we are transitioning 1-indexed to 0-indexed for Board, we check both for the first month.
            let paymentLookupNum = installmentNum;
            if (isBoardType && installmentNum > 0 && installmentNum !== 98 && installmentNum !== 99 && installmentNum !== 100) {
                paymentLookupNum = installmentNum - 1;
            }

            let existingPaymentRecord = await Payment.findOne({
                admission: admissionId,
                installmentNumber: paymentLookupNum,
                status: { $nin: ["REJECTED", "CANCELLED"] }
            }).sort({ createdAt: -1 });

            if (!existingPaymentRecord && isBoardType && installmentNum !== 98 && installmentNum !== 99 && installmentNum !== 100) {
                const alternateNum = paymentLookupNum === installmentNum - 1 ? installmentNum : installmentNum - 1;
                existingPaymentRecord = await Payment.findOne({
                    admission: admissionId,
                    installmentNumber: alternateNum,
                    status: { $nin: ["REJECTED", "CANCELLED"] }
                }).sort({ createdAt: -1 });
                
                if (existingPaymentRecord) {
                    paymentLookupNum = alternateNum;
                }
            }

            // Block bill generation for uncleared CHEQUE payments
            const isChequePending = (existingPaymentRecord && existingPaymentRecord.paymentMethod === "CHEQUE" && existingPaymentRecord.status === "PENDING_CLEARANCE") ||
                (!existingPaymentRecord && installment.paymentMethod === "CHEQUE" && (installment.status === "PENDING_CLEARANCE" || admission.downPaymentStatus === "PENDING_CLEARANCE"));
            if (isChequePending) {
                console.error(`❌ Installment #${installmentNum} is a CHEQUE pending clearance. Bill cannot be generated until cleared in Cheque Management.`);
                return { status: 400, data: { message: "Cheque payment is pending clearance. Bill can only be generated after cheque clearance in Cheque Management." } };
            }

            if (!existingPaymentRecord && installment.status !== "PAID" && installment.status !== "PARTIAL") {
                // Special check: If any amount is paid for installment 0/1, allow bill generation
                if (!( (installmentNum === 0 || installmentNum === 1) && (installment.paidAmount > 0 || (isBoardType && (admission.examFeePaid > 0 || admission.totalPaidAmount > 0))))) {
                    console.error(`❌ Installment #${installmentNum} is not PAID. Status: ${installment.status}`);
                    return { status: 400, data: { message: "Cannot generate bill for unpaid installment" } };
                }
            }

            // --- QUERY CONSTRUCTION ---
            let query;
            if (queryBillId) {
                query = { billId: queryBillId };
            } else {
                query = {
                    admission: admissionId,
                    installmentNumber: paymentLookupNum, // Use the matched index (0 or 1)
                    status: { $nin: ["REJECTED", "CANCELLED"] }
                };

                if (isBoardType) {
                    if (installmentNum === 0 && !isBoardAdmission) {
                        // Down payments
                    } else if (billingMonth) {
                        query.billingMonth = billingMonth;
                    }
                }
            }

            let payment = await Payment.findOne(query).populate('bankAccount').sort({ createdAt: -1 });

            // Determine the actual total amount paid for this bill from source of truth
            // For installment 0 (standard), we trust admission.downPayment. 
            // For others, we trust the specific payment record's amount if available, otherwise installment.paidAmount.
            let actualPaidTotal = 0;
            if (payment && payment.paidAmount > 0) {
                actualPaidTotal = payment.paidAmount;
                // SELF-HEALING: If Transaction ID is missing in Payment record, but present in Admission record, fix it!
                if (!payment.transactionId && installment.transactionId) {
                    console.log(`🏥 Self-healing: Extracting missing Transaction ID from Admission: ${installment.transactionId}`);
                    payment.transactionId = installment.transactionId;
                    await payment.save();
                }
            } else if (installmentNum === 0 && !isBoardAdmission) {
                actualPaidTotal = admission.downPayment;
            } else if (installmentNum === 0 && isBoardAdmission) {
                // If payment record wasn't found (unlikely due to self-healing above), 
                // the installment.paidAmount is the only fall-back, though it might be the sum.
                actualPaidTotal = installment.paidAmount || 0;
            } else {
                actualPaidTotal = installment.paidAmount || 0;
            }

            // If payment record is missing but installment is PAID, create it (Self-healing)
            if (!payment) {
                console.warn(`⚠️ Payment record missing for PAID installment. Creating one now...`);

                // Calculate tax amounts
                const exempt = isGstExempt({
                    centreName: centre.centreName,
                    admission,
                    student: admission.student || admission.studentId
                });
                const totalAmount = parseFloat(Number(actualPaidTotal).toFixed(2));
                const baseAmount = exempt ? totalAmount : totalAmount / 1.18;
                const courseFee = parseFloat(baseAmount.toFixed(2));
                const remainingForGst = exempt ? 0 : totalAmount - courseFee;
                const cgst = parseFloat((remainingForGst / 2).toFixed(2));
                const sgst = parseFloat((remainingForGst - cgst).toFixed(2));

                payment = new Payment({
                    admission: admissionId,
                    installmentNumber: paymentLookupNum,
                    amount: isBoardAdmission ? (installment.payableAmount || installment.standardAmount) : installment.amount,
                    paidAmount: totalAmount,
                    dueDate: installment.dueDate,
                    paidDate: isBoardAdmission ? new Date() : (installment.paidDate || new Date()),
                    receivedDate: isBoardAdmission 
                        ? (installment.paymentTransactions?.length > 0 ? installment.paymentTransactions[installment.paymentTransactions.length - 1].date : new Date())
                        : (installment.receivedDate || installment.paidDate || new Date()),
                    status: installment.status || "PAID",
                    paymentMethod: installment.paymentMethod || 
                        (isBoardAdmission && installment.paymentTransactions?.length > 0 
                            ? installment.paymentTransactions[installment.paymentTransactions.length - 1].paymentMethod 
                            : "CASH"),
                    transactionId: installment.transactionId || (isBoardAdmission && installment.paymentTransactions?.length > 0 ? installment.paymentTransactions[installment.paymentTransactions.length - 1].transactionId : ""),
                    remarks: installment.remarks || (isBoardAdmission ? `Board Installment Month ${installment.monthNumber}` : ""),
                    recordedBy: req.user?.id || req.user?._id,
                    centre: centre.centreName || admission.centre,
                    cgst,
                    sgst,
                    courseFee,
                    totalAmount,
                    accountHolderName: installment.accountHolderName,
                    chequeDate: installment.chequeDate,
                    billingMonth: billingMonth || (isBoardAdmission ? new Date(installment.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : undefined)
                });

                await payment.save();
                console.log(`✅ Created missing payment record: ${payment._id}`);
            }

            if (!payment.centre) {
                payment.centre = centre.centreName || admission.centre;
                await payment.save();
            }

            // If payment exists but doesn't have a bill ID (or has an old MIG- ID), generate/fix it
            // NEVER generate bill ID for uncleared CHEQUE payments (they get their bill ID on clearance in Cheque Management)
            if ((!payment.billId || payment.billId.startsWith('MIG-')) && !(payment.paymentMethod === 'CHEQUE' && payment.status === 'PENDING_CLEARANCE')) {
                payment.billId = await generateBillId(centre.enterCode || 'GEN', payment.receivedDate);
                await payment.save();
            }

            // Use stored amounts from Payment record if available, otherwise calculate using GST helper
            const exempt = isGstExempt({
                centreName: centre.centreName,
                admission,
                student: admission.student || admission.studentId
            });
            const billTotal = payment?.paidAmount !== undefined && payment.paidAmount > 0
                ? payment.paidAmount
                : (payment?.totalAmount || actualPaidTotal);

            let finalCourseFee, finalCgst, finalSgst;
            if (exempt) {
                finalCourseFee = parseFloat(Number(billTotal).toFixed(2));
                finalCgst = 0;
                finalSgst = 0;
                if (payment && (payment.cgst > 0 || payment.sgst > 0)) {
                    payment.cgst = 0;
                    payment.sgst = 0;
                    payment.courseFee = finalCourseFee;
                    payment.save().catch(err => console.error("Error updating exempt payment in generateBill:", err));
                }
            } else if (payment && payment.courseFee !== undefined && payment.cgst !== undefined && payment.sgst !== undefined) {
                finalCourseFee = parseFloat(Number(payment.courseFee).toFixed(2));
                finalCgst = parseFloat(Number(payment.cgst).toFixed(2));
                finalSgst = parseFloat(Number(payment.sgst).toFixed(2));
            } else {
                const billBase = exempt ? billTotal : billTotal / 1.18;
                finalCourseFee = parseFloat(billBase.toFixed(2));
                const finalGstPool = exempt ? 0 : billTotal - finalCourseFee;
                finalCgst = parseFloat((finalGstPool / 2).toFixed(2));
                finalSgst = parseFloat((finalGstPool - finalCgst).toFixed(2));
            }

            // Resolve bank account details
            const bankAccDetails = await resolveBankAccountDetails(payment, admission, installmentNum, isBoardAdmission);

            const studentDoc = admission.student || admission.studentId;
            const studentDetails = studentDoc?.studentsDetails?.[0] || {};
            const resolvedStudentName = (isBoardAdmission
                ? (admission.studentName || studentDetails.studentName)
                : (studentDetails.studentName || admission.studentName)) || 'N/A';
            const resolvedPhone = (isBoardAdmission
                ? (admission.mobileNum || studentDetails.mobileNum || studentDetails.whatsappNumber)
                : (studentDetails.mobileNum || studentDetails.whatsappNumber || admission.mobileNum)) || 'N/A';
            const resolvedEmail = studentDetails.studentEmail || admission.email || admission.studentEmail || 'N/A';
            const resolvedAdmNo = admission.admissionNumber || studentDoc?.admissionNumber || studentDetails.rollNo || 'N/A';

            // Auto-heal discrepancy so Student document is always in sync with Board Admission
            if (isBoardAdmission && admission.studentName && studentDoc?._id && studentDetails.studentName !== admission.studentName) {
                Student.updateOne(
                    { _id: studentDoc._id },
                    { $set: { "studentsDetails.0.studentName": admission.studentName } }
                ).catch(e => console.error("Auto-heal Student name error:", e));
            }

            // Prepare bill data
            const billData = {
                billId: payment.billId,
                billDate: payment.paidDate || new Date(),
                gstNumber: generateGSTNumber(),
                centre: {
                    name: centre.centreName,
                    address: centre.address || 'N/A',
                    phoneNumber: centre.phoneNumber || 'N/A',
                    gstNumber: centre.enterGstNo || 'N/A',
                    corporateAddress: centre.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                    corporatePhone: centre.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
                },
                student: {
                    id: (admission.student?._id || admission.studentId?._id || admission.studentId || 'N/A'),
                    name: resolvedStudentName,
                    admissionNumber: resolvedAdmNo,
                    phoneNumber: resolvedPhone,
                    email: resolvedEmail
                },
                course: {
                    name: payment.boardCourseName || (admission.boardCourseName || (admission.course?.courseName || 'N/A')),
                    department: admission.department?.departmentName || admission.student?.department?.departmentName || 'N/A',
                    examTag: admission.examTag?.name || admission.examTag?.tagName || (admission.student?.sessionExamCourse && admission.student.sessionExamCourse.find(sec => sec.session === admission.academicSession)?.examTag) || 'N/A',
                    class: admission.class?.name || admission.lastClass || (admission.student?.examSchema && admission.student.examSchema[0]?.class) || 'N/A',
                    session: admission.academicSession || 'N/A'
                },
                payment: {
                    installmentNumber: payment.installmentNumber,
                    paymentMethod: payment.paymentMethod,
                    // Fallback to Admission record's transactionId if not in Payment record
                    transactionId: payment.transactionId || (installment ? (installment.transactionId || 'N/A') : 'N/A'),
                    paidDate: payment.paidDate,
                    receivedDate: payment.receivedDate,
                    bankName: payment.bankName || (installment ? installment.bankName : '') || (payment.accountHolderName || ''),
                    accountHolderName: payment.accountHolderName || (installment ? installment.accountHolderName : '') || '',
                    chequeDate: payment.chequeDate,
                    bankAccount: bankAccDetails ? {
                        _id: bankAccDetails._id,
                        accname: bankAccDetails.accname,
                        accno: bankAccDetails.accno
                    } : null,
                    bankAccountName: bankAccDetails ? bankAccDetails.label : (payment.depositAccount || null),
                    status: payment.status,
                    remarks: payment.remarks || (installment ? installment.remarks : '') || (admission ? admission.remarks : '') || ''
                },
                amounts: {
                    courseFee: finalCourseFee,
                    cgst: finalCgst,
                    sgst: finalSgst,
                    totalAmount: billTotal
                }
            };

            return {
                status: 200,
                data: {
                    success: true,
                    message: "Bill generated successfully",
                    data: billData
                }
            };
        } catch (err) {
            console.error("Error inside generateBillLogic:", err);
            return { status: 500, data: { message: "Server error", error: err.message } };
        }
    })();

    activeGenerations.set(lockKey, generatePromise);

    try {
        const result = await generatePromise;
        activeGenerations.delete(lockKey);
        return res.status(result.status).json(result.data);
    } catch (err) {
        activeGenerations.delete(lockKey);
        console.error("Error generating bill:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get bill by billId
export const getBillById = async (req, res) => {
    try {
        const { billId } = req.params;

        const payment = await Payment.findOne({ billId })
            .populate('bankAccount')
            .populate({
                path: 'admission',
                populate: [
                    { path: 'student', populate: { path: 'batches' } },
                    { path: 'course' },
                    { path: 'board' },
                    { path: 'department' },
                    { path: 'examTag' },
                    { path: 'class' }
                ]
            });

        if (!payment) {
            return res.status(404).json({ message: "Bill not found" });
        }

        const admission = payment.admission;
        let boardCourseAdmission = null;
        let allocation = null;

        if (!admission || !admission.department) {
            if (payment.admission) {
                boardCourseAdmission = await BoardCourseAdmission.findById(payment.admission)
                    .populate('department', 'departmentName')
                    .populate('examTag', 'name')
                    .populate('boardId', 'boardCourse name')
                    .populate('studentId')
                    .lean();
            }
            allocation = await Allocation.findOne({ billNumber: billId })
                .populate('student')
                .populate('admission')
                .lean();
        }

        // Fetch centre information
        const centre = await CentreSchema.findOne({ centreName: admission?.centre || allocation?.centre || payment.centre });
        if (!centre) {
            return res.status(404).json({ message: "Centre information not found" });
        }

        const exempt = isGstExempt({
            centreName: centre.centreName,
            admission,
            student: admission?.student
        });
        const billTotal = payment.paidAmount !== undefined && payment.paidAmount > 0
            ? payment.paidAmount
            : (payment.totalAmount || 0);

        let finalCourseFee, finalCgst, finalSgst;
        if (exempt) {
            finalCourseFee = parseFloat(Number(billTotal).toFixed(2));
            finalCgst = 0;
            finalSgst = 0;
            if (payment && (payment.cgst > 0 || payment.sgst > 0)) {
                payment.cgst = 0;
                payment.sgst = 0;
                payment.courseFee = finalCourseFee;
                payment.save().catch(err => console.error("Error updating exempt single payment in generateBill:", err));
            }
        } else if (payment.courseFee !== undefined && payment.cgst !== undefined && payment.sgst !== undefined) {
            finalCourseFee = parseFloat(Number(payment.courseFee).toFixed(2));
            finalCgst = parseFloat(Number(payment.cgst).toFixed(2));
            finalSgst = parseFloat(Number(payment.sgst).toFixed(2));
        } else {
            const billBase = exempt ? billTotal : billTotal / 1.18;
            finalCourseFee = parseFloat(billBase.toFixed(2));
            const finalGstPool = exempt ? 0 : billTotal - finalCourseFee;
            finalCgst = parseFloat((finalGstPool / 2).toFixed(2));
            finalSgst = parseFloat((finalGstPool - finalCgst).toFixed(2));
        }

        const studentProfile = admission?.student?.studentsDetails?.[0] || 
                               allocation?.student?.studentsDetails?.[0] || 
                               boardCourseAdmission?.studentId?.studentsDetails?.[0] || {};

        let resolvedStudentName = (boardCourseAdmission?.studentName || admission?.studentName || studentProfile.studentName || 'N/A').trim();
        let resolvedPhone = boardCourseAdmission?.mobileNum || admission?.mobileNum || studentProfile.mobileNum || studentProfile.whatsappNumber || 'N/A';
        let resolvedEmail = boardCourseAdmission?.studentEmail || studentProfile.studentEmail || admission?.studentEmail || 'N/A';
        let resolvedAdmNo = admission?.admissionNumber || allocation?.admissionNumber || boardCourseAdmission?.admissionNumber || studentProfile.formNo || studentProfile.rollNo || 'N/A';

        // Auto-heal Student record if needed when board admission has updated name
        if (boardCourseAdmission && boardCourseAdmission.studentId && boardCourseAdmission.studentName) {
            const sid = boardCourseAdmission.studentId._id || boardCourseAdmission.studentId;
            if (studentProfile.studentName && studentProfile.studentName !== boardCourseAdmission.studentName) {
                Student.updateOne(
                    { _id: sid, 'studentsDetails.0': { $exists: true } },
                    { $set: { 'studentsDetails.0.studentName': boardCourseAdmission.studentName } }
                ).catch(e => console.error("Auto-heal Student name in getBillById error:", e));
            }
        }

        const bankAccDetails = await resolveBankAccountDetails(
            payment,
            admission || boardCourseAdmission,
            payment.installmentNumber,
            !admission && Boolean(boardCourseAdmission)
        );

        const billData = {
            billId: payment.billId,
            billDate: payment.paidDate || new Date(),
            centre: {
                name: centre.centreName,
                address: centre.address || 'N/A',
                phoneNumber: centre.phoneNumber || 'N/A',
                gstNumber: centre.enterGstNo || 'N/A',
                corporateAddress: centre.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                corporatePhone: centre.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
            },
            student: {
                id: admission?.student?._id || allocation?.student?._id || allocation?.student || payment.studentId,
                name: resolvedStudentName,
                admissionNumber: resolvedAdmNo,
                phoneNumber: resolvedPhone,
                email: resolvedEmail
            },
            course: {
                name: payment.boardCourseName || (allocation?.items?.map(i => `${i.itemName} (x${i.quantity || 1})`).join(', ')) || (admission?.boardCourseName || (admission?.course?.courseName || 'N/A')),
                department: (admission?.department?.departmentName && !/inventory/i.test(admission.department.departmentName) ? admission.department.departmentName : null) ||
                            (allocation?.departmentName && !/inventory/i.test(allocation.departmentName) ? allocation.departmentName : null) ||
                            boardCourseAdmission?.department?.departmentName ||
                            admission?.student?.department?.departmentName || 'N/A',
                examTag: (admission?.examTag?.name && !/inventory/i.test(admission.examTag.name) ? admission.examTag.name : null) ||
                         (allocation?.examTagName && !/inventory/i.test(allocation.examTagName) ? allocation.examTagName : null) ||
                         boardCourseAdmission?.examTag?.name || 'N/A',
                class: admission?.class?.name ||
                       allocation?.className ||
                       boardCourseAdmission?.lastClass || 'N/A',
                session: admission?.academicSession ||
                         allocation?.session ||
                         boardCourseAdmission?.academicSession || 'N/A'
            },
            payment: {
                installmentNumber: payment.installmentNumber,
                paymentMethod: payment.paymentMethod,
                transactionId: payment.transactionId,
                paidDate: payment.paidDate,
                receivedDate: payment.receivedDate,
                bankName: payment.bankName || payment.accountHolderName || '',
                accountHolderName: payment.accountHolderName,
                chequeDate: payment.chequeDate,
                bankAccount: bankAccDetails ? {
                    _id: bankAccDetails._id,
                    accname: bankAccDetails.accname,
                    accno: bankAccDetails.accno
                } : null,
                bankAccountName: bankAccDetails ? bankAccDetails.label : (payment.depositAccount || null),
                status: payment.status
            },
            amounts: {
                courseFee: finalCourseFee,
                cgst: finalCgst,
                sgst: finalSgst,
                totalAmount: billTotal
            }
        };

        res.status(200).json({
            success: true,
            data: billData
        });

    } catch (err) {
        console.error("Error fetching bill:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get all bills for an admission
export const getBillsByAdmission = async (req, res) => {
    try {
        const { admissionId } = req.params;
        const { includeCheques, all } = req.query;

        const filter = { admission: admissionId };
        if (includeCheques === 'true' || all === 'true') {
            filter.$or = [
                { billId: { $exists: true, $ne: null } },
                { paymentMethod: "CHEQUE" }
            ];
        } else {
            filter.billId = { $exists: true, $ne: null };
        }

        const payments = await Payment.find(filter)
            .populate('bankAccount')
            .populate({
                path: 'admission',
                populate: [
                    { path: 'student' },
                    { path: 'course' }
                ]
            }).sort({ paidDate: 1, receivedDate: 1 });

        const bills = payments.map(payment => {
            const acc = payment.bankAccount;
            const bankAccLabel = acc && acc.accname
                ? (acc.accno ? `${acc.accname.toUpperCase()} (A/C: ${acc.accno})` : acc.accname.toUpperCase())
                : (payment.depositAccount || null);

            return {
                _id: payment._id,
                billId: payment.billId || null,
                isReceivingSlip: !payment.billId && payment.paymentMethod === 'CHEQUE' && payment.status === 'PENDING_CLEARANCE',
                billDate: payment.paidDate || payment.receivedDate,
                paidDate: payment.paidDate,
                receivedDate: payment.receivedDate,
                installmentNumber: payment.installmentNumber,
                courseFee: payment.courseFee,
                cgst: payment.cgst,
                sgst: payment.sgst,
                totalAmount: payment.totalAmount,
                paymentMethod: payment.paymentMethod,
                transactionId: payment.transactionId,
                bankName: payment.bankName,
                accountHolderName: payment.accountHolderName,
                chequeDate: payment.chequeDate,
                bankAccount: acc ? {
                    _id: acc._id,
                    accname: acc.accname,
                    accno: acc.accno
                } : null,
                bankAccountName: bankAccLabel,
                status: payment.status,
                remarks: payment.remarks,
                boardCourseName: payment.boardCourseName
            };
        });

        res.status(200).json({
            success: true,
            count: bills.length,
            data: bills
        });

    } catch (err) {
        console.error("Error fetching bills:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Generate Receiving Slip for Cheque Payments (Strictly read-only, no Bill ID generation, no daily collection)
export const generateReceivingSlip = async (req, res) => {
    try {
        const { admissionId, installmentNumber } = req.params;
        const { billingMonth, paymentId } = { ...req.query, ...req.body };
        const installmentNum = parseInt(installmentNumber) || 0;

        // Find admission: try standard Admission first, then BoardCourseAdmission
        let admission = await Admission.findById(admissionId)
            .populate({
                path: 'student',
                populate: [
                    { path: 'department' },
                    { path: 'batches', select: 'batchName' }
                ]
            })
            .populate('course')
            .populate('board')
            .populate('department')
            .populate('examTag')
            .populate('class');

        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(admissionId)
                .populate({
                    path: 'studentId',
                    populate: [
                        { path: 'department' },
                        { path: 'batches', select: 'batchName' }
                    ]
                })
                .populate('boardId')
                .populate('department')
                .populate('examTag');

            if (admission) {
                isBoardAdmission = true;
                admission.student = admission.studentId;
                admission.centre = admission.centre || "General";
                admission.boardCourseName = admission.boardCourseName || (admission.boardId?.boardCourse || "Board Course");
                admission.academicSession = admission.academicSession || "N/A";
                admission.admissionNumber = admission.admissionNumber || "PENDING";
            }
        }

        if (!admission) {
            return res.status(404).json({ success: false, message: "Admission not found" });
        }

        // Centre resolution
        let centre = await CentreSchema.findOne({ centreName: admission.centre });
        if (!centre) {
            centre = await CentreSchema.findOne({
                centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') }
            });
        }
        if (!centre) {
            centre = {
                centreName: admission.centre || "Pathfinder",
                address: 'N/A',
                phoneNumber: 'N/A',
                enterGstNo: 'N/A',
                enterCorporateOfficeAddress: '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                enterCorporateOfficePhoneNumber: '033 2455-1840 / 2454-4817 / 4668'
            };
        }

        // Locate payment record or installment details
        let payment = null;
        if (paymentId) {
            payment = await Payment.findById(paymentId).populate('bankAccount');
        }

        if (!payment) {
            let paymentQuery = {
                admission: admissionId,
                paymentMethod: "CHEQUE"
            };

            if (isBoardAdmission) {
                // In board admissions, installment numbers might be 0-indexed or 1-indexed
                const candidates = [installmentNum, installmentNum - 1, installmentNum === 1 ? 0 : installmentNum].filter(n => n >= 0);
                payment = await Payment.findOne({
                    admission: admissionId,
                    installmentNumber: { $in: candidates },
                    paymentMethod: "CHEQUE"
                }).populate('bankAccount').sort({ createdAt: -1 });

                if (!payment && billingMonth) {
                    payment = await Payment.findOne({
                        admission: admissionId,
                        billingMonth,
                        paymentMethod: "CHEQUE"
                    }).populate('bankAccount').sort({ createdAt: -1 });
                }
            } else {
                payment = await Payment.findOne({
                    admission: admissionId,
                    installmentNumber: installmentNum,
                    paymentMethod: "CHEQUE"
                }).populate('bankAccount').sort({ createdAt: -1 });
            }
        }

        // Fallback: if no payment record has paymentMethod CHEQUE specifically queried, get latest payment for this installment
        if (!payment) {
            payment = await Payment.findOne({
                admission: admissionId,
                installmentNumber: isBoardAdmission && installmentNum > 0 ? { $in: [installmentNum, installmentNum - 1] } : installmentNum
            }).populate('bankAccount').sort({ createdAt: -1 });
        }

        // Extract installment data from admission structure if available
        let instData = null;
        if (isBoardAdmission && admission.installments) {
            instData = admission.installments.find(i => i.monthNumber === installmentNum || i._id?.toString() === installmentNumber);
        } else if (!isBoardAdmission && admission.paymentBreakdown) {
            instData = admission.paymentBreakdown.find(p => p.installmentNumber === installmentNum);
        }

        // Check if payment is definitively cleared/approved with an official billId and PAID status
        const isCleardCheque = payment && Boolean(payment.billId) && 
                               (payment.status === "PAID" || payment.status === "COMPLETED") && 
                               payment.status !== "REJECTED" && 
                               payment.status !== "CANCELLED";

        if (isCleardCheque) {
            return generateBill(req, res);
        }

        // Determine paid amount
        let actualPaidTotal = payment?.paidAmount || payment?.totalAmount || 0;
        if (actualPaidTotal <= 0) {
            if (installmentNum === 0 && admission.downPayment > 0) {
                actualPaidTotal = admission.downPayment;
            } else if (instData && (instData.paidAmount > 0 || instData.amount > 0)) {
                actualPaidTotal = instData.paidAmount || instData.amount;
            }
        }

        // Calculate fee breakdown
        const exempt = isGstExempt({
            centreName: centre.centreName,
            admission,
            student: admission.student || admission.studentId,
            boardName: admission.boardCourseName
        });

        let finalCourseFee, finalCgst, finalSgst;
        if (exempt) {
            finalCourseFee = parseFloat(Number(actualPaidTotal).toFixed(2));
            finalCgst = 0;
            finalSgst = 0;
        } else if (payment && payment.courseFee !== undefined && payment.cgst !== undefined && payment.sgst !== undefined && payment.courseFee > 0) {
            finalCourseFee = parseFloat(Number(payment.courseFee).toFixed(2));
            finalCgst = parseFloat(Number(payment.cgst).toFixed(2));
            finalSgst = parseFloat(Number(payment.sgst).toFixed(2));
        } else {
            const billBase = actualPaidTotal / 1.18;
            finalCourseFee = parseFloat(billBase.toFixed(2));
            const finalGstPool = actualPaidTotal - finalCourseFee;
            finalCgst = parseFloat((finalGstPool / 2).toFixed(2));
            finalSgst = parseFloat((finalGstPool - finalCgst).toFixed(2));
        }

        const bankAccDetails = await resolveBankAccountDetails(payment, admission, installmentNum, isBoardAdmission);

        const studentProfile = admission.student?.studentsDetails?.[0] || admission.studentId?.studentsDetails?.[0] || {};
        let resolvedStudentName = (admission.studentName || studentProfile.studentName || 'N/A').trim();
        let resolvedPhone = admission.mobileNum || studentProfile.mobileNum || studentProfile.whatsappNumber || 'N/A';
        let resolvedEmail = admission.studentEmail || studentProfile.studentEmail || 'N/A';
        let resolvedAdmNo = admission.admissionNumber || studentProfile.rollNo || studentProfile.formNo || 'N/A';

        // Auto-heal Student record if needed when board admission has updated name
        if (isBoardAdmission && admission.studentId && admission.studentName) {
            const sid = admission.studentId._id || admission.studentId;
            if (studentProfile.studentName && studentProfile.studentName !== admission.studentName) {
                Student.updateOne(
                    { _id: sid, 'studentsDetails.0': { $exists: true } },
                    { $set: { 'studentsDetails.0.studentName': admission.studentName } }
                ).catch(e => console.error("Auto-heal Student name in generateReceivingSlip error:", e));
            }
        }

        const receivingSlipData = {
            isReceivingSlip: true,
            billId: null, // Strictly NO bill number for receiving slip
            slipType: "CHEQUE RECEIVING SLIP",
            slipDate: payment?.receivedDate || payment?.paidDate || instData?.receivedDate || new Date(),
            billDate: payment?.receivedDate || payment?.paidDate || instData?.receivedDate || new Date(),
            gstNumber: (centre.enterGstNo && centre.enterGstNo !== 'N/A') ? centre.enterGstNo : (centre.gstNumber || 'N/A'),
            centre: {
                name: centre.centreName || admission.centre,
                address: centre.address || 'N/A',
                phoneNumber: centre.phoneNumber || 'N/A',
                gstNumber: centre.enterGstNo || 'N/A',
                corporateAddress: centre.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                corporatePhone: centre.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
            },
            student: {
                id: (admission.student?._id || admission.studentId?._id || admission.studentId || 'N/A'),
                name: resolvedStudentName,
                admissionNumber: resolvedAdmNo,
                phoneNumber: resolvedPhone,
                email: resolvedEmail
            },
            course: {
                name: payment?.boardCourseName || (admission.boardCourseName || (admission.course?.courseName || 'N/A')),
                department: admission.department?.departmentName || admission.student?.department?.departmentName || 'N/A',
                examTag: admission.examTag?.name || admission.examTag?.tagName || (admission.student?.sessionExamCourse && admission.student.sessionExamCourse.find(sec => sec.session === admission.academicSession)?.examTag) || 'N/A',
                class: admission.class?.name || admission.lastClass || (admission.student?.examSchema && admission.student.examSchema[0]?.class) || 'N/A',
                session: admission.academicSession || 'N/A'
            },
            payment: {
                installmentNumber: payment?.installmentNumber !== undefined ? payment.installmentNumber : installmentNum,
                paymentMethod: "CHEQUE",
                transactionId: payment?.transactionId || instData?.transactionId || admission.downPaymentTransactionId || 'N/A',
                bankName: payment?.bankName || instData?.bankName || 'N/A',
                accountHolderName: payment?.accountHolderName || instData?.accountHolderName || 'N/A',
                chequeDate: payment?.chequeDate || instData?.chequeDate || null,
                bankAccount: bankAccDetails ? {
                    _id: bankAccDetails._id,
                    accname: bankAccDetails.accname,
                    accno: bankAccDetails.accno
                } : null,
                bankAccountName: bankAccDetails ? bankAccDetails.label : (payment?.depositAccount || null),
                paidDate: payment?.paidDate || instData?.paidDate,
                receivedDate: payment?.receivedDate || instData?.receivedDate || new Date(),
                status: "PENDING_CLEARANCE",
                remarks: payment?.remarks || instData?.remarks || admission.remarks || "Cheque Received (Subject to Realisation)"
            },
            amounts: {
                grossFee: actualPaidTotal,
                waiver: 0,
                courseFee: finalCourseFee,
                cgst: finalCgst,
                sgst: finalSgst,
                totalAmount: actualPaidTotal
            }
        };

        return res.status(200).json({
            success: true,
            message: "Receiving slip generated successfully",
            data: receivingSlipData
        });

    } catch (err) {
        console.error("Error generating receiving slip:", err);
        return res.status(500).json({ success: false, message: "Server error generating receiving slip", error: err.message });
    }
};

