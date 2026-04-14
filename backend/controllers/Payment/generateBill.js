import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { generateBillId } from "../../utils/billIdGenerator.js";


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
export const generateBill = async (req, res) => {
    try {
        const { admissionId, installmentNumber } = req.params;
        const installmentNum = parseInt(installmentNumber);

        // Find the admission - Try standard first, then Board
        let admission = await Admission.findById(admissionId)
            .populate('student')
            .populate('course')
            .populate('board')
            .populate('department')
            .populate('examTag')
            .populate('class');

        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(admissionId)
                .populate('studentId')
                .populate('boardId');
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
            return res.status(404).json({ message: "Admission not found" });
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

        if (isBoardAdmission && installmentNum !== 0) {
            installment = admission.installments.find(i => i.monthNumber === installmentNum);
        } else if (installmentNum === 0) {
            // Standalone fee (Exam Fee / Down Payment / etc)
            isDownPayment = true;
            // For Board Admissions, installment 0 is usually the Exam Fee or initial standalone fee
            // We'll create a virtual object from the payment record or admission data
            installment = {
                installmentNumber: 0,
                amount: isBoardAdmission ? admission.examFee : admission.downPayment,
                paidAmount: isBoardAdmission ? admission.examFeePaid : admission.downPayment,
                dueDate: admission.admissionDate,
                paidDate: admission.admissionDate,
                status: isBoardAdmission ? admission.examFeeStatus : (admission.downPaymentStatus || "PAID"),
                paymentMethod: "CASH", // Will be overridden by actual payment record below
                remarks: isBoardAdmission ? "Board Examination Fee" : "Down Payment at Admission"
            };
        } else {
            // Find the installment in payment breakdown for standard admissions
            installment = admission.paymentBreakdown.find(
                p => p.installmentNumber === installmentNum
            );
        }

        if (!installment) {
            console.error(`❌ Installment #${installmentNum} not found in admission`);
            return res.status(404).json({ message: "Installment not found" });
        }

        if (installment.status !== "PAID" && installment.status !== "PENDING_CLEARANCE" && installment.status !== "PARTIAL") {
            // Special check: If any amount is paid for installment 0, allow bill generation
            if (!(installmentNum === 0 && installment.paidAmount > 0)) {
                console.error(`❌ Installment #${installmentNum} is not PAID or PENDING_CLEARANCE. Status: ${installment.status}`);
                return res.status(400).json({ message: "Cannot generate bill for unpaid installment" });
            }
        }

        // Check if payment record exists
        const { billingMonth, billId } = req.query;

        let query;
        if (billId) {
            query = { billId: billId };
        } else {
            query = {
                admission: admissionId,
                installmentNumber: installmentNum
            };

            if (isBoardAdmission || admission.admissionType === 'BOARD') {
                if (installmentNum === 0 && !isBoardAdmission) {
                    // Down payments
                } else if (billingMonth) {
                    query.billingMonth = billingMonth;
                }
            }
        }

        let payment = await Payment.findOne(query);

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
            const totalAmount = parseFloat(Number(actualPaidTotal).toFixed(2));
            const baseAmount = totalAmount / 1.18;
            const courseFee = parseFloat(baseAmount.toFixed(2));
            const remainingForGst = totalAmount - courseFee;
            const cgst = parseFloat((remainingForGst / 2).toFixed(2));
            const sgst = parseFloat((remainingForGst - cgst).toFixed(2));

            payment = new Payment({
                admission: admissionId,
                installmentNumber: installmentNum,
                amount: isBoardAdmission ? (installment.payableAmount || installment.standardAmount) : installment.amount,
                paidAmount: totalAmount,
                dueDate: installment.dueDate,
                paidDate: installment.paidDate || (isBoardAdmission && installment.paymentTransactions?.length > 0 ? installment.paymentTransactions[installment.paymentTransactions.length - 1].date : new Date()),
                receivedDate: installment.receivedDate || installment.paidDate || new Date(),
                status: installment.status || "PAID",
                paymentMethod: installment.paymentMethod || "CASH",
                transactionId: installment.transactionId || (isBoardAdmission && installment.paymentTransactions?.length > 0 ? installment.paymentTransactions[installment.paymentTransactions.length - 1].transactionId : ""),
                remarks: installment.remarks || (isBoardAdmission ? `Board Installment Month ${installment.monthNumber}` : ""),
                recordedBy: req.user?.id || req.user?._id,
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

        // If payment exists but doesn't have a bill ID (or has an old MIG- ID), generate/fix it
        if (!payment.billId || payment.billId.startsWith('MIG-')) {
            payment.billId = await generateBillId(centre.enterCode || 'GEN', payment.receivedDate);
            await payment.save();
        }

        // RE-CALCULATE amounts for the bill response to match UI source of truth
        // This fixes legacy/corrupted records where totalAmount was set to baseAmount
        const billTotal = Math.max(actualPaidTotal, payment.totalAmount || 0);
        const billBase = billTotal / 1.18;
        const finalCourseFee = parseFloat(billBase.toFixed(2));
        const finalGstPool = billTotal - finalCourseFee;
        const finalCgst = parseFloat((finalGstPool / 2).toFixed(2));
        const finalSgst = parseFloat((finalGstPool - finalCgst).toFixed(2));


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
                name: (admission.student?.studentsDetails?.[0]?.studentName || admission.studentName || 'N/A'),
                admissionNumber: admission.admissionNumber || 'N/A',
                phoneNumber: (admission.student?.studentsDetails?.[0]?.mobileNum || admission.mobileNum || 'N/A'),
                email: (admission.student?.studentsDetails?.[0]?.studentEmail || 'N/A')
            },
            course: {
                name: payment.boardCourseName || (admission.boardCourseName || (admission.course?.courseName || 'N/A')),
                department: admission.department?.departmentName || 'N/A',
                examTag: admission.examTag?.name || 'N/A',
                class: admission.class?.name || 'N/A',
                session: admission.academicSession || 'N/A'
            },
            payment: {
                installmentNumber: payment.installmentNumber,
                paymentMethod: payment.paymentMethod,
                // Fallback to Admission record's transactionId if not in Payment record
                transactionId: payment.transactionId || (installment ? (installment.transactionId || 'N/A') : 'N/A'),
                paidDate: payment.paidDate,
                receivedDate: payment.receivedDate,
                accountHolderName: payment.accountHolderName,
                chequeDate: payment.chequeDate,
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
            message: "Bill generated successfully",
            data: billData
        });

    } catch (err) {
        console.error("Error generating bill:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get bill by billId
export const getBillById = async (req, res) => {
    try {
        const { billId } = req.params;

        const payment = await Payment.findOne({ billId })
            .populate({
                path: 'admission',
                populate: [
                    { path: 'student' },
                    { path: 'course' },
                    { path: 'department' },
                    { path: 'examTag' },
                    { path: 'class' }
                ]
            });

        if (!payment) {
            return res.status(404).json({ message: "Bill not found" });
        }

        const admission = payment.admission;

        // Fetch centre information
        const centre = await CentreSchema.findOne({ centreName: admission.centre });
        if (!centre) {
            return res.status(404).json({ message: "Centre information not found" });
        }

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
                id: admission.student._id,
                name: admission.student.studentsDetails?.[0]?.studentName || 'N/A',
                admissionNumber: admission.admissionNumber,
                phoneNumber: admission.student.studentsDetails?.[0]?.mobileNum || 'N/A',
                email: admission.student.studentsDetails?.[0]?.studentEmail || 'N/A'
            },
            course: {
                name: payment.boardCourseName || (admission.boardCourseName || (admission.course?.courseName || 'N/A')),
                department: admission.department?.departmentName || 'N/A',
                examTag: admission.examTag?.name || 'N/A',
                class: admission.class?.name || 'N/A',
                session: admission.academicSession || 'N/A'
            },
            payment: {
                installmentNumber: payment.installmentNumber,
                paymentMethod: payment.paymentMethod,
                transactionId: payment.transactionId,
                paidDate: payment.paidDate,
                receivedDate: payment.receivedDate,
                accountHolderName: payment.accountHolderName,
                chequeDate: payment.chequeDate,
                status: payment.status
            },
            amounts: {
                courseFee: payment.courseFee,
                cgst: payment.cgst,
                sgst: payment.sgst,
                totalAmount: payment.totalAmount
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

        const payments = await Payment.find({
            admission: admissionId,
            billId: { $exists: true, $ne: null }
        }).populate({
            path: 'admission',
            populate: [
                { path: 'student' },
                { path: 'course' }
            ]
        }).sort({ paidDate: 1 });

        const bills = payments.map(payment => ({
            billId: payment.billId,
            billDate: payment.paidDate,
            installmentNumber: payment.installmentNumber,
            courseFee: payment.courseFee,
            cgst: payment.cgst,
            sgst: payment.sgst,
            totalAmount: payment.totalAmount,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            remarks: payment.remarks,
            boardCourseName: payment.boardCourseName
        }));

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
