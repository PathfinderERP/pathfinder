import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Payment from './models/Payment/Payment.js';
import Course from './models/Master_data/Courses.js';
import { generateBillId } from './utils/billIdGenerator.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; 
const CENTRE_NAME = "BALLY";
const CENTRE_CODE = "BL";

const studentData = {
    name: "DEBARGHA KOLEY",
    id: "PATH20001604", // User specified ID
    phone: "0000000000",
    courseId: "6985e2683868c72bbc435f63", // Foundation Class IX (In-station) 2026-2027
    totalFees: 35000,
    paid: 12000,
    session: "2026-2027",
    dueInstallments: 6
};

async function insertData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        console.log(`Processing student: ${studentData.name}...`);

        const course = await Course.findById(studentData.courseId);
        if (!course) throw new Error(`Course not found for ID: ${studentData.courseId}`);

        const student = new Student({
            studentsDetails: [{
                studentName: studentData.name,
                mobileNum: studentData.phone,
                whatsappNumber: studentData.phone,
                centre: CENTRE_NAME,
                programme: course.programme || 'CRP'
            }],
            isEnrolled: true,
            status: 'Active'
        });
        const savedStudent = await student.save();

        const dpBaseAmount = studentData.paid / 1.18;
        const dpCgst = dpBaseAmount * 0.09;
        const dpSgst = dpBaseAmount * 0.09;
        const dpCourseFee = studentData.paid - dpCgst - dpSgst;

        const totalFeesBase = studentData.totalFees / 1.18;
        const totalCgst = totalFeesBase * 0.09;
        const totalSgst = totalFeesBase * 0.09;
        const totalBase = studentData.totalFees - totalCgst - totalSgst;

        const remainingAmount = studentData.totalFees - studentData.paid;
        const instAmount = studentData.dueInstallments > 0 ? (remainingAmount / studentData.dueInstallments) : 0;

        const admission = new Admission({
            student: savedStudent._id,
            admissionType: "NORMAL",
            course: studentData.courseId,
            class: course.class,
            examTag: course.examTag,
            department: course.department,
            centre: CENTRE_NAME,
            admissionNumber: studentData.id,
            academicSession: studentData.session,
            baseFees: parseFloat(totalBase.toFixed(2)),
            cgstAmount: parseFloat(totalCgst.toFixed(2)),
            sgstAmount: parseFloat(totalSgst.toFixed(2)),
            totalFees: studentData.totalFees,
            downPayment: studentData.paid,
            downPaymentStatus: "PAID",
            downPaymentMethod: "CASH",
            downPaymentReceivedDate: new Date(),
            remainingAmount: parseFloat(remainingAmount.toFixed(2)),
            numberOfInstallments: studentData.dueInstallments,
            installmentAmount: parseFloat(instAmount.toFixed(2)),
            paymentStatus: (studentData.paid >= studentData.totalFees) ? "COMPLETED" : "PARTIAL",
            totalPaidAmount: studentData.paid,
            createdBy: ADMIN_ID
        });
        const savedAdmission = await admission.save();

        const billId = await generateBillId(CENTRE_CODE);
        const payment = new Payment({
            admission: savedAdmission._id,
            installmentNumber: 0,
            amount: studentData.paid,
            paidAmount: studentData.paid,
            dueDate: new Date(),
            paidDate: new Date(),
            receivedDate: new Date(),
            status: "PAID",
            paymentMethod: "CASH",
            billId: billId,
            recordedBy: ADMIN_ID,
            cgst: parseFloat(dpCgst.toFixed(2)),
            sgst: parseFloat(dpSgst.toFixed(2)),
            courseFee: parseFloat(dpCourseFee.toFixed(2)),
            totalAmount: studentData.paid
        });
        await payment.save();

        console.log(`✅ Inserted ${studentData.name} (Admission: ${studentData.id}, Bill: ${billId})`);

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
