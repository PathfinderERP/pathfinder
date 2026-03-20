import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Malay Maity
const CENTRE_NAME = "CHANDANNAGAR";

const studentData = {
    name: "Aneek kumar Dey",
    id: "PATH24007253",
    phone: "0000000000", // Using numeric placeholder to pass DB validation (match: /^[0-9]{8,15}$/)
    courseId: "698ecacccc716f7a61ea074e", // Foundation IN-station Class (IX+X) 2Years 2025-2027
    totalFees: 61360,
    paid: 60360,
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
                whatsappNumber: studentData.phone,
                centre: CENTRE_NAME,
                programme: course.programme || 'CRP'
            }],
            isEnrolled: true,
            status: 'Active'
        });
        const savedStudent = await student.save();
        console.log(`✅ Student created: ${savedStudent._id}`);

        // Calculate GST breakdown (18% inclusive)
        const totalFeesBase = studentData.totalFees / 1.18;
        const totalCgst = totalFeesBase * 0.09;
        const totalSgst = totalFeesBase * 0.09;
        const totalBase = studentData.totalFees - totalCgst - totalSgst;

        // 2. Create Admission (NO BILL GENERATION)
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
            remainingAmount: studentData.totalFees - studentData.paid,
            numberOfInstallments: 0,
            installmentAmount: 0,
            paymentStatus: (studentData.paid >= studentData.totalFees) ? "COMPLETED" : "PARTIAL",
            totalPaidAmount: studentData.paid,
            createdBy: ADMIN_ID
        });
        const savedAdmission = await admission.save();

        console.log(`✅ Inserted ${studentData.name} (Admission: ${studentData.id})`);
        console.log("Note: Payment/Bill records were NOT generated as requested.");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
