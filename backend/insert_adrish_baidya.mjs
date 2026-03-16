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
const CENTRE_NAME = "HAZRA H.O";
const CENTRE_CODE = "HZ";

const studentData = {
    name: "ADRISH BAIDYA",
    id: "PATH250001615",
    phone: "8777593081",
    whatsapp: "9903571978",
    courseId: "6971d4707b7d1cb9d0af9e43",
    totalFees: 150000,
    paid: 122250,
    session: "2025-2027"
};

async function insertData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        console.log(`Processing student: ${studentData.name}...`);

        // Fetch Course for mapping details
        const course = await Course.findById(studentData.courseId);
        if (!course) throw new Error(`Course not found for ID: ${studentData.courseId}`);

        // 1. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: studentData.name,
                mobileNum: studentData.phone,
                whatsappNumber: studentData.whatsapp,
                centre: CENTRE_NAME,
                programme: 'CRP'
            }],
            isEnrolled: true,
            status: 'Active'
        });
        const savedStudent = await student.save();

        // Calculate GST breakdown (assuming 18% inclusive)
        const dpBaseAmount = studentData.paid / 1.18;
        const dpCgst = dpBaseAmount * 0.09;
        const dpSgst = dpBaseAmount * 0.09;
        const dpCourseFee = studentData.paid - dpCgst - dpSgst;

        const totalFeesBase = studentData.totalFees / 1.18;
        const totalCgst = totalFeesBase * 0.09;
        const totalSgst = totalFeesBase * 0.09;
        const totalBase = studentData.totalFees - totalCgst - totalSgst;

        // 2. Create Admission
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
            remainingAmount: Math.max(0, studentData.totalFees - studentData.paid),
            numberOfInstallments: 0,
            installmentAmount: 0,
            paymentStatus: (studentData.paid >= studentData.totalFees) ? "COMPLETED" : "PARTIAL",
            totalPaidAmount: studentData.paid,
            createdBy: ADMIN_ID,
            feeStructureSnapshot: course.feesStructure
        });
        const savedAdmission = await admission.save();

        // 3. Create Payment record (Down Payment)
        if (studentData.paid > 0) {
            const billId = await generateBillId(CENTRE_CODE);
            const payment = new Payment({
                admission: savedAdmission._id,
                installmentNumber: 0, // Down Payment
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
        } else {
            console.log(`✅ Inserted ${studentData.name} (Admission: ${studentData.id}, No Payment)`);
        }

        console.log("\nStudent inserted successfully!");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
