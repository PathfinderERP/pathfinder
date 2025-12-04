import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";


// Generate a unique sequential bill ID starting with PATH
const generateBillId = async () => {
    try {
        // Find the last payment with a billId starting with PATH
        const lastPayment = await Payment.findOne({
            billId: { $regex: /^PATH/ }
        }).sort({ createdAt: -1 });

        if (!lastPayment || !lastPayment.billId) {
            return 'PATH0001';
        }

        // Extract the number part
        const lastId = lastPayment.billId;
        const numberPart = lastId.replace('PATH', '');
        const nextNumber = parseInt(numberPart) + 1;

        // Pad with zeros to ensure 4 digits
        return `PATH${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
        // Fallback to timestamp if something goes wrong
        return `PATH${Date.now()}`;
    }
};

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

        console.log(`🧾 Generating bill for Admission: ${admissionId}, Installment: ${installmentNum}`);

        // Find the admission
        const admission = await Admission.findById(admissionId)
            .populate('student')
            .populate('course')
            .populate('department')
            .populate('examTag')
            .populate('class');

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
                address: '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                phoneNumber: '033 2455-1840 / 2454-4817 / 4668',
                enterGstNo: 'N/A'
            };
        }

        let installment;
        let isDownPayment = false;

        // Check if this is the down payment (installment 0)
        if (installmentNum === 0) {
            // Down payment is not in paymentBreakdown, create a virtual installment object
            isDownPayment = true;
            installment = {
                installmentNumber: 0,
                amount: admission.downPayment,
                paidAmount: admission.downPayment,
                dueDate: admission.admissionDate,
                paidDate: admission.admissionDate,
                status: "PAID",
                paymentMethod: "CASH", // Default, will be overridden by actual payment record
                remarks: "Down Payment at Admission"
            };
        } else {
            // Find the installment in payment breakdown
            installment = admission.paymentBreakdown.find(
                p => p.installmentNumber === installmentNum
            );

            if (!installment) {
                console.error(`❌ Installment #${installmentNum} not found in admission`);
                return res.status(404).json({ message: "Installment not found" });
            }

            if (installment.status !== "PAID") {
                console.error(`❌ Installment #${installmentNum} is not PAID. Status: ${installment.status}`);
                return res.status(400).json({ message: "Cannot generate bill for unpaid installment" });
            }
        }

        // Check if payment record exists
        console.log(`🔍 Looking for payment record: Admission ${admissionId}, Installment ${installmentNum}`);
        let payment = await Payment.findOne({
            admission: admissionId,
            installmentNumber: installmentNum
        });

        // If payment record is missing but installment is PAID, create it (Self-healing)
        if (!payment) {
            console.warn(`⚠️ Payment record missing for PAID installment. Creating one now...`);
            
            // Calculate tax amounts
            const paidAmount = installment.paidAmount;
            const baseAmount = paidAmount / 1.18;
            const cgst = baseAmount * 0.09;
            const sgst = baseAmount * 0.09;
            const courseFee = baseAmount;
            const totalAmount = paidAmount;

            payment = new Payment({
                admission: admissionId,
                installmentNumber: installmentNum,
                amount: installment.amount,
                paidAmount: paidAmount,
                dueDate: installment.dueDate,
                paidDate: installment.paidDate || new Date(),
                status: "PAID",
                paymentMethod: installment.paymentMethod || "CASH",
                transactionId: installment.transactionId,
                remarks: installment.remarks,
                recordedBy: req.user?.id, // Might be undefined if not authenticated, but that's okay for recovery
                cgst: parseFloat(cgst.toFixed(2)),
                sgst: parseFloat(sgst.toFixed(2)),
                courseFee: parseFloat(courseFee.toFixed(2)),
                totalAmount: parseFloat(totalAmount.toFixed(2))
            });

            await payment.save();
            console.log(`✅ Created missing payment record: ${payment._id}`);
        }

        // If payment exists but doesn't have a bill ID, generate one
        if (!payment.billId) {
            payment.billId = await generateBillId();

            // Ensure tax calculations are present
            if (!payment.cgst || !payment.sgst || !payment.courseFee) {
                const baseAmount = payment.paidAmount / 1.18;
                payment.cgst = parseFloat((baseAmount * 0.09).toFixed(2));
                payment.sgst = parseFloat((baseAmount * 0.09).toFixed(2));
                payment.courseFee = parseFloat(baseAmount.toFixed(2));
                payment.totalAmount = parseFloat(payment.paidAmount.toFixed(2));
            }

            await payment.save();
        }


        // Prepare bill data
        const billData = {
            billId: payment.billId,
            billDate: payment.paidDate || new Date(),
            gstNumber: generateGSTNumber(), // Add generated GST number
            centre: {
                name: centre.centreName,
                address: centre.address || 'N/A',
                phoneNumber: centre.phoneNumber || 'N/A',
                gstNumber: centre.enterGstNo || 'N/A'
            },
            student: {
                id: admission.student._id,
                name: admission.student.studentsDetails?.[0]?.studentName || 'N/A',
                admissionNumber: admission.admissionNumber,
                phoneNumber: admission.student.studentsDetails?.[0]?.mobileNum || 'N/A',
                email: admission.student.studentsDetails?.[0]?.studentEmail || 'N/A'
            },
            course: {
                name: admission.course?.courseName || 'N/A',
                department: admission.department?.departmentName || 'N/A',
                examTag: admission.examTag?.name || 'N/A',
                class: admission.class?.name || 'N/A',
                session: admission.academicSession || 'N/A'
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
                gstNumber: centre.enterGstNo || 'N/A'
            },
            student: {
                id: admission.student._id,
                name: admission.student.studentsDetails?.[0]?.studentName || 'N/A',
                admissionNumber: admission.admissionNumber,
                phoneNumber: admission.student.studentsDetails?.[0]?.mobileNum || 'N/A',
                email: admission.student.studentsDetails?.[0]?.studentEmail || 'N/A'
            },
            course: {
                name: admission.course?.courseName || 'N/A',
                department: admission.department?.departmentName || 'N/A',
                examTag: admission.examTag?.name || 'N/A',
                class: admission.class?.name || 'N/A',
                session: admission.academicSession || 'N/A'
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
