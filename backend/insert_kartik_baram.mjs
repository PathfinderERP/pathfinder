import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Malay Maity
const CENTRE_NAME = "KHARAGPUR";

const data = {
    enroll: "PATH26001539",
    name: "KARTIK BARAM",
    email: "apurbabaram@gmail.com",
    phone: "9531761074",
    courseId: "6985e2693868c72bbc435f89",
    classId: "6970866aabb4820c05aeca29",
    totalFees: 0,
    paid: 0,
    session: "2026-2027",
    counselledBy: "Kharagpur Pathfinder CI"
};

async function insertData() {
    try {
        if (!MONGO_URL) throw new Error("MONGO_URL not found in .env");
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        console.log(`Processing student: ${data.name}...`);

        // Fetch Course for mapping details
        const course = await Course.findById(data.courseId);
        if (!course) throw new Error(`Course not found for ID: ${data.courseId}`);

        // 1. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: data.name,
                studentEmail: data.email,
                mobileNum: data.phone,
                whatsappNumber: data.phone,
                centre: CENTRE_NAME,
                programme: course.programme || 'CRP',
                class: data.classId
            }],
            course: data.courseId,
            department: course.department,
            isEnrolled: true,
            status: 'Active',
            counselledBy: data.counselledBy
        });
        const savedStudent = await student.save();
        console.log(`✅ Student created: ${savedStudent._id}`);

        // 2. Create Admission (NO BILL GENERATION)
        const admission = new Admission({
            student: savedStudent._id,
            admissionType: "NORMAL",
            course: data.courseId,
            class: data.classId,
            examTag: course.examTag,
            department: course.department,
            centre: CENTRE_NAME,
            admissionNumber: data.enroll,
            academicSession: data.session,
            baseFees: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            totalFees: data.totalFees,
            downPayment: data.paid,
            downPaymentStatus: "PAID",
            downPaymentMethod: "CASH",
            downPaymentReceivedDate: new Date(),
            remainingAmount: 0,
            numberOfInstallments: 0,
            installmentAmount: 0,
            paymentStatus: "COMPLETED",
            totalPaidAmount: data.paid,
            createdBy: ADMIN_ID,
            admissionDate: new Date(),
            sectionAllotment: {
                omrCode: data.enroll
            }
        });
        const savedAdmission = await admission.save();

        console.log(`✅ Inserted ${data.name} (Admission: ${data.enroll})`);
        console.log("\nStudent inserted successfully without bill generation!");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
