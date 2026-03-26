import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Malay Maity
const CENTRE_NAME = "JODHPUR PARK";

const studentData = {
    name: "SREEJA MONDAL",
    email: "sreejamontfort@gmail.com",
    id: "PATH25023333",
    phone: "9830567736",
    courseId: "6985e634fc0bd6eb8119eb08", // Foundation (NS) Class IX (In-station) 2025-2026
    totalFees: 0, // No bill will be generated
    paid: 0,
    session: "2025-2026",
    counselledBy: "SUVASHIS BANERJEE CI"
};

async function insertData() {
    try {
        if (!MONGO_URL) throw new Error("MONGO_URL not found in .env");
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        console.log(`Processing student: ${studentData.name}...`);

        // Fetch Course for mapping details
        const course = await Course.findById(studentData.courseId);
        if (!course) throw new Error(`Course not found for ID: ${studentData.courseId}`);

        // 1. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: studentData.name,
                studentEmail: studentData.email,
                mobileNum: studentData.phone,
                whatsappNumber: studentData.phone,
                centre: CENTRE_NAME,
                programme: course.programme || 'CRP',
                class: "6970866aabb4820c05aeca2b" // Class 9
            }],
            isEnrolled: true,
            status: 'Active',
            counselledBy: studentData.counselledBy
        });
        const savedStudent = await student.save();
        console.log(`✅ Student created: ${savedStudent._id}`);

        // 2. Create Admission (NO BILL GENERATION)
        const admission = new Admission({
            student: savedStudent._id,
            admissionType: "NORMAL",
            course: studentData.courseId,
            class: "6970866aabb4820c05aeca2b", // Class IX
            examTag: course.examTag,
            department: course.department,
            centre: CENTRE_NAME,
            admissionNumber: studentData.id,
            academicSession: studentData.session,
            baseFees: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            totalFees: studentData.totalFees,
            downPayment: studentData.paid,
            downPaymentStatus: "PAID",
            downPaymentMethod: "CASH",
            downPaymentReceivedDate: new Date(),
            remainingAmount: 0,
            numberOfInstallments: 0,
            installmentAmount: 0,
            paymentStatus: "COMPLETED",
            totalPaidAmount: studentData.paid,
            createdBy: ADMIN_ID,
            admissionDate: new Date()
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
