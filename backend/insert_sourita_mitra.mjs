
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import User from './models/User.js';
import Payment from './models/Payment/Payment.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // 1. Find the admin user to use as creator
        const adminUser = await User.findOne({ role: /Super Admin/i });
        const creatorId = adminUser ? adminUser._id : null;

        // 2. Data from User Request
        const studentName = "SOURITA MITRA";
        const admissionNumber = "PATH25022614";
        const courseId = "6971d4707b7d1cb9d0af9e4f"; // NEET 2Years 2026-2028
        const centreName = "HAZRA H.O";
        const totalFees = 130000;
        const downPayment = 33750;
        const mobileNum = "7003609462";
        const whatsappNumber = "9836544200";

        // 3. Find Course
        const course = await Course.findById(courseId);
        if (!course) {
            console.error('Course not found');
            process.exit(1);
        }

        // 4. Create Student
        let student = await Student.findOne({ 
            $or: [
                { "studentsDetails.mobileNum": mobileNum },
                { "studentsDetails.studentName": studentName }
            ]
        });

        if (!student) {
            student = new Student({
                studentsDetails: [{
                    studentName: studentName.toUpperCase(),
                    centre: centreName,
                    mobileNum: mobileNum,
                    whatsappNumber: whatsappNumber,
                    source: "MANUAL",
                }],
                course: course._id,
                isEnrolled: true,
                status: 'Active'
            });
            await student.save();
            console.log('Student created:', student._id);
        } else {
            student.isEnrolled = true;
            await student.save();
            console.log('Student updated:', student._id);
        }

        // 5. Calculate Fees and Waiver
        const baseFees = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
        const taxableAmount = parseFloat((totalFees / 1.18).toFixed(3));
        const cgstAmount = parseFloat((taxableAmount * 0.09).toFixed(3));
        const sgstAmount = parseFloat((taxableAmount * 0.09).toFixed(3));
        const discountAmount = Math.max(0, (baseFees * 1.18) - totalFees);

        const remainingAmount = totalFees - downPayment;
        const numberOfInstallments = 18; // Standard
        const installmentAmount = Math.ceil(remainingAmount / numberOfInstallments);

        // 6. Payment Breakdown
        const paymentBreakdown = [];
        const admissionDate = new Date();
        for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(admissionDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            paymentBreakdown.push({
                installmentNumber: i + 1,
                dueDate: dueDate,
                amount: i === numberOfInstallments - 1
                    ? remainingAmount - (installmentAmount * (numberOfInstallments - 1))
                    : installmentAmount,
                status: "PENDING"
            });
        }

        // 7. Create Admission
        const existingAdmission = await Admission.findOne({ admissionNumber: admissionNumber });
        if (existingAdmission) {
            console.log('Admission already exists with number:', admissionNumber);
        } else {
            const admission = new Admission({
                student: student._id,
                admissionType: "NORMAL",
                admissionNumber: admissionNumber,
                course: course._id,
                class: course.class,
                examTag: course.examTag,
                department: course.department,
                centre: centreName,
                academicSession: course.courseSession || "2026-2028",
                baseFees: baseFees,
                discountAmount: Number(discountAmount.toFixed(2)),
                cgstAmount,
                sgstAmount,
                totalFees: totalFees,
                downPayment: downPayment,
                remainingAmount: remainingAmount,
                numberOfInstallments: numberOfInstallments,
                installmentAmount: installmentAmount,
                paymentBreakdown: paymentBreakdown,
                feeStructureSnapshot: course.feesStructure,
                remarks: "Manual Entry as requested",
                createdBy: creatorId,
                totalPaidAmount: downPayment,
                paymentStatus: (downPayment >= totalFees) ? "COMPLETED" : "PARTIAL",
                downPaymentStatus: "PAID",
                downPaymentReceivedDate: admissionDate,
                admissionDate: admissionDate
            });

            await admission.save();
            console.log('Admission created:', admission._id);

            // 8. Create Payment Record (without automatic Bill ID generation as requested)
            const paymentRecord = new Payment({
                admission: admission._id,
                installmentNumber: 0,
                amount: downPayment,
                paidAmount: downPayment,
                dueDate: admissionDate,
                paidDate: admissionDate,
                receivedDate: admissionDate,
                status: "PAID",
                paymentMethod: "CASH",
                // billId: null, // User requested no bill number
                totalAmount: downPayment,
                courseFee: parseFloat((downPayment / 1.18).toFixed(2)),
                cgst: parseFloat(((downPayment - (downPayment / 1.18)) / 2).toFixed(2)),
                sgst: parseFloat(((downPayment - (downPayment / 1.18)) / 2).toFixed(2)),
                recordedBy: creatorId,
                remarks: "Initial Payment - Manual Entry"
            });
            await paymentRecord.save();
            console.log('Payment record created (No Bill ID generated)');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
