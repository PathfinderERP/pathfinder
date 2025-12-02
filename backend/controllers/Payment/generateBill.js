import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";

// Generate a unique bill ID
const generateBillId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `BILL${timestamp}${random}`;
};

// Generate bill for a payment
export const generateBill = async (req, res) => {
    try {
        const { admissionId, installmentNumber } = req.params;

        // Find the admission
        const admission = await Admission.findById(admissionId)
            .populate('student')
            .populate('course')
            .populate('department')
            .populate('examTag')
            .populate('class');

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        // Find the installment in payment breakdown
        const installment = admission.paymentBreakdown.find(
            p => p.installmentNumber === parseInt(installmentNumber)
        );

        if (!installment) {
            return res.status(404).json({ message: "Installment not found" });
        }

        if (installment.status !== "PAID") {
            return res.status(400).json({ message: "Cannot generate bill for unpaid installment" });
        }

        // Check if bill already exists for this payment
        let payment = await Payment.findOne({
            admission: admissionId,
            installmentNumber: parseInt(installmentNumber)
        });

        // Calculate tax amounts (CGST and SGST are typically 9% each = 18% total)
        // paidAmount is inclusive of 18% GST
        const baseAmount = installment.paidAmount / 1.18;
        const cgst = baseAmount * 0.09;
        const sgst = baseAmount * 0.09;
        const courseFee = baseAmount;
        const totalAmount = installment.paidAmount;

        if (!payment) {
            // Create new payment record with bill details
            payment = new Payment({
                admission: admissionId,
                installmentNumber: parseInt(installmentNumber),
                amount: installment.amount,
                paidAmount: installment.paidAmount,
                dueDate: installment.dueDate,
                paidDate: installment.paidDate,
                status: installment.status,
                paymentMethod: installment.paymentMethod,
                transactionId: installment.transactionId,
                remarks: installment.remarks,
                recordedBy: req.user?.id,
                billId: generateBillId(),
                cgst: parseFloat(cgst.toFixed(2)),
                sgst: parseFloat(sgst.toFixed(2)),
                courseFee: parseFloat(courseFee.toFixed(2)),
                totalAmount: parseFloat(totalAmount.toFixed(2))
            });

            await payment.save();
        } else if (!payment.billId) {
            // Update existing payment with bill details
            payment.billId = generateBillId();
            payment.cgst = parseFloat(cgst.toFixed(2));
            payment.sgst = parseFloat(sgst.toFixed(2));
            payment.courseFee = parseFloat(courseFee.toFixed(2));
            payment.totalAmount = parseFloat(totalAmount.toFixed(2));
            
            await payment.save();
        }

        // Populate the payment with admission details
        await payment.populate('admission');

        // Prepare bill data
        const billData = {
            billId: payment.billId,
            billDate: payment.paidDate || new Date(),
            student: {
                id: admission.student._id,
                name: admission.student.name,
                admissionNumber: admission.admissionNumber,
                phoneNumber: admission.student.phoneNumber,
                email: admission.student.email
            },
            course: {
                name: admission.course?.courseName || 'N/A',
                department: admission.department?.departmentName || 'N/A',
                examTag: admission.examTag?.examTagName || 'N/A',
                class: admission.class?.className || 'N/A'
            },
            payment: {
                installmentNumber: payment.installmentNumber,
                paymentMethod: payment.paymentMethod,
                transactionId: payment.transactionId,
                paidDate: payment.paidDate
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

        const billData = {
            billId: payment.billId,
            billDate: payment.paidDate || new Date(),
            student: {
                id: admission.student._id,
                name: admission.student.name,
                admissionNumber: admission.admissionNumber,
                phoneNumber: admission.student.phoneNumber,
                email: admission.student.email
            },
            course: {
                name: admission.course?.courseName || 'N/A',
                department: admission.department?.departmentName || 'N/A',
                examTag: admission.examTag?.examTagName || 'N/A',
                class: admission.class?.className || 'N/A'
            },
            payment: {
                installmentNumber: payment.installmentNumber,
                paymentMethod: payment.paymentMethod,
                transactionId: payment.transactionId,
                paidDate: payment.paidDate
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
        }).sort({ paidDate: -1 });

        const bills = payments.map(payment => ({
            billId: payment.billId,
            billDate: payment.paidDate,
            installmentNumber: payment.installmentNumber,
            courseFee: payment.courseFee,
            cgst: payment.cgst,
            sgst: payment.sgst,
            totalAmount: payment.totalAmount,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId
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
