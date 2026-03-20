import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // SuperAdmin ID from previous scripts
const CENTRE_NAME = "HAZRA H.O";

const studentData = {
    name: "SAMAR FATIMA",
    id: "PATH25003448",
    phone: "8335921955",
    email: "shaziakhanam96@gmail.com",
    courseId: "6985e5f9fc0bd6eb8119e339", // NEET REPEATER (NS) 2025-2026
    totalFees: 55000,
    paid: 45000,
    session: "2025-2026"
};

async function insertData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        console.log(`Processing student: ${studentData.name}...`);

        const course = await Course.findById(studentData.courseId);
        if (!course) throw new Error(`Course not found for ID: ${studentData.courseId}`);

        // 1. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: studentData.name,
                mobileNum: studentData.phone,
                whatsappNumber: studentData.phone,
                email: studentData.email,
                centre: CENTRE_NAME,
                programme: course.programme || 'CRP'
            }],
            isEnrolled: true,
            status: 'Active'
        });
        const savedStudent = await student.save();

        // 2. Calculations (GST 18%)
        const totalFeesBase = studentData.totalFees / 1.18;
        const totalCgst = totalFeesBase * 0.09;
        const totalSgst = totalFeesBase * 0.09;
        const totalBase = studentData.totalFees - totalCgst - totalSgst;

        const remainingAmount = studentData.totalFees - studentData.paid;

        // 3. Create Admission
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
            numberOfInstallments: 0,
            installmentAmount: 0,
            paymentStatus: (studentData.paid >= studentData.totalFees) ? "COMPLETED" : "PARTIAL",
            totalPaidAmount: studentData.paid,
            createdBy: ADMIN_ID
        });
        const savedAdmission = await admission.save();

        console.log(`✅ Inserted ${studentData.name} (Admission: ${studentData.id})`);
        console.log(`No bills generated as per request.`);

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
