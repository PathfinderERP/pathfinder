import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Courses from './models/Master_data/Courses.js';
import Payment from './models/Payment/Payment.js';
import Centre from './models/Master_data/Centre.js';
import { generateBillId } from './utils/billIdGenerator.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        // 0. Cleanup any previous attempts for this name/ID
        const oldBoard = await BoardCourseAdmission.findOne({ studentName: "ADRIJA PODDER" });
        if (oldBoard) {
            await Student.findByIdAndDelete(oldBoard.studentId);
            await BoardCourseAdmission.findByIdAndDelete(oldBoard._id);
            await Payment.deleteMany({ admission: oldBoard._id, admissionModel: "BoardCourseAdmission" });
            console.log("Cleaned up previous Board Admission record.");
        }

        const courseId = "6985e28d3868c72bbc4364fa"; 
        const course = await Courses.findById(courseId);
        
        const centreName = "HAZRA H.O";
        const admissionNumber = "PATH25023840";
        const totalAmount = 12400;
        const paidAmount = 1000;
        
        const taxableTotal = totalAmount / 1.18;
        const totalGst = totalAmount - taxableTotal;

        // 1. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: "ADRIJA PODDER",
                studentEmail: "ananyapodder55555@rediffmail.com",
                mobileNum: "9831755594",
                whatsappNumber: "9831755594",
                centre: centreName,
                programme: "NCRP"
            }],
            status: "Active",
            isEnrolled: true
        });
        await student.save();

        // 2. Create Normal Admission
        const admission = new Admission({
            student: student._id,
            admissionType: "NORMAL",
            course: courseId,
            class: course.class,
            examTag: course.examTag,
            department: course.department,
            centre: centreName,
            admissionDate: new Date(),
            admissionNumber: admissionNumber,
            academicSession: "2026-2027",
            baseFees: taxableTotal,
            cgstAmount: totalGst / 2,
            sgstAmount: totalGst / 2,
            totalFees: totalAmount,
            downPayment: paidAmount,
            remainingAmount: totalAmount - paidAmount,
            numberOfInstallments: 1,
            installmentAmount: totalAmount - paidAmount,
            paymentBreakdown: [{
                installmentNumber: 1,
                dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                amount: totalAmount - paidAmount,
                status: "PENDING"
            }],
            paymentStatus: "PARTIAL",
            totalPaidAmount: paidAmount,
            admissionStatus: "ACTIVE",
            createdBy: "6970c4129590082b81674b65" // Super Admin
        });

        await admission.save();
        console.log("Normal Admission created:", admission.admissionNumber);

        // 3. Create Payment Record (for Finance/Sales/Bill)
        let centreObj = await Centre.findOne({ centreName: centreName });
        const billId = await generateBillId(centreObj?.enterCode || "HAZ");

        const taxableDP = paidAmount / 1.18;
        const gstDP = paidAmount - taxableDP;

        const payment = new Payment({
            admission: admission._id,
            admissionModel: "Admission",
            installmentNumber: 0,
            amount: totalAmount,
            paidAmount: paidAmount,
            dueDate: new Date(),
            paidDate: new Date(),
            receivedDate: new Date(),
            status: "PAID",
            paymentMethod: "CASH",
            transactionId: "DP-" + Date.now(),
            billingMonth: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
            billId: billId,
            courseFee: taxableDP,
            cgst: gstDP / 2,
            sgst: gstDP / 2,
            totalAmount: paidAmount,
            remarks: "Initial Downpayment - Adrija Podder"
        });

        await payment.save();
        console.log("Payment record created:", payment.billId);

        console.log("\nSuccessfully added ADRIJA PODDER to NORMAL admissions.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
