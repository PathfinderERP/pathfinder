import Admission from "../../models/Admission/Admission.js";
import Course from "../../models/Master_data/Courses.js";
import Student from "../../models/Students.js";
import Payment from "../../models/Payment/Payment.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";

export const createAdmission = async (req, res) => {
    try {
        const {
            studentId,
            courseId,
            classId,
            examTagId,
            departmentId, // Optional now
            centre, // New field
            academicSession,
            downPayment,
            numberOfInstallments,
            studentImage,
            remarks,
            feeWaiver = 0 // Discount amount
        } = req.body;

        // Validate required fields
        if (!studentId || !courseId || !examTagId || !centre || !academicSession || !downPayment || !numberOfInstallments) {
            return res.status(400).json({ message: "All required fields must be provided (including Centre)" });
        }

        // Fetch student details for carry forward balance
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const previousBalance = student.carryForwardBalance || 0;

        // Fetch course details
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Calculate Fees
        const baseFees = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
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

        const installmentAmount = Math.ceil(remainingAmount / numberOfInstallments);

        // Generate payment breakdown
        const paymentBreakdown = [];
        const currentDate = new Date();

        for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            paymentBreakdown.push({
                installmentNumber: i + 1,
                dueDate: dueDate,
                amount: i === numberOfInstallments - 1
                    ? remainingAmount - (installmentAmount * (numberOfInstallments - 1))
                    : installmentAmount,
                status: "PENDING",
                remarks: i === 0 && previousBalance > 0 ? `Includes previous balance: ₹${previousBalance}` : ""
            });
        }

        // Check for existing admission to reuse Admission Number
        const existingAdmission = await Admission.findOne({ student: studentId }).sort({ createdAt: -1 });
        const admissionNumber = existingAdmission ? existingAdmission.admissionNumber : undefined;

        // Create admission
        const admission = new Admission({
            student: studentId,
            admissionNumber, // Reuse if exists, otherwise schema hook generates new
            course: courseId,
            class: classId || null,
            examTag: examTagId,
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
            feeStructureSnapshot: course.feesStructure,
            studentImage: studentImage || null,
            remarks: remarks ? `${remarks} (Prev Balance: ₹${previousBalance})` : (previousBalance > 0 ? `Previous Balance Included: ₹${previousBalance}` : ""),
            createdBy: req.user.id,
            totalPaidAmount: downPayment,
            paymentStatus: downPayment >= totalFees ? "COMPLETED" : "PARTIAL"
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

            const payment = new Payment({
                admission: admission._id,
                installmentNumber: 0, // 0 for down payment
                amount: downPayment,
                paidAmount: downPayment,
                dueDate: new Date(),
                paidDate: new Date(),
                status: "PAID",
                paymentMethod: "CASH", // Default to CASH for initial, can be updated
                remarks: "Down Payment at Admission",
                recordedBy: req.user.id,
                // Bill Details
                billId: `BILL${Date.now()}${Math.floor(Math.random() * 1000)}`,
                cgst: parseFloat(dpCgst.toFixed(2)),
                sgst: parseFloat(dpSgst.toFixed(2)),
                courseFee: parseFloat(dpCourseFee.toFixed(2)),
                totalAmount: parseFloat(Number(downPayment).toFixed(2))
            });
            await payment.save();
        }

        const populatedAdmission = await Admission.findById(admission._id)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department');

        res.status(201).json({
            message: "Admission created successfully",
            admission: populatedAdmission
        });

    } catch (err) {
        console.error("Admission creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
