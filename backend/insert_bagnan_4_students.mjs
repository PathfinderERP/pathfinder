import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Malay Maity
const CENTRE_NAME = "BAGNAN";

const studentsData = [
    {
        enroll: "PATH26001585",
        name: "RIMIL ADHIKARY",
        courseName: "Foundation Class IX (In-station) 2026-2027",
        courseId: "6985e2683868c72bbc435f63",
        classId: "6970866aabb4820c05aeca2b",
        totalFees: 32000,
        paid: 6000,
        session: "2026-2027"
    },
    {
        enroll: "PATH26001587",
        name: "SAMPURNA MANNA",
        courseName: "Foundation Class VII (Instation) 2026-2027",
        courseId: "6985e2693868c72bbc435f89",
        classId: "6970866aabb4820c05aeca29",
        totalFees: 29000,
        paid: 6000,
        session: "2026-2027"
    },
    {
        enroll: "PATH26001588",
        name: "PRADIPTI MONDAL",
        courseName: "Foundation Class VII (Instation) 2026-2027",
        courseId: "6985e2693868c72bbc435f89",
        classId: "6970866aabb4820c05aeca29",
        totalFees: 29500,
        paid: 6000,
        session: "2026-2027"
    },
    {
        enroll: "PATH26001590",
        name: "ANUSHKA MANNA",
        courseName: "Foundation Class X (Instation) 2026-2027",
        courseId: "6985e2683868c72bbc435f59",
        classId: "6970866aabb4820c05aeca2c",
        totalFees: 34000,
        paid: 5000,
        session: "2026-2027"
    }
];

async function insertData() {
    try {
        if (!MONGO_URL) throw new Error("MONGO_URL not found in .env");
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        for (const data of studentsData) {
            console.log(`Processing student: ${data.name}...`);

            // Fetch Course for mapping details
            const course = await Course.findById(data.courseId);
            if (!course) throw new Error(`Course not found for ID: ${data.courseId}`);

            // 1. Create Student
            const student = new Student({
                studentsDetails: [{
                    studentName: data.name,
                    studentEmail: `${data.enroll.toLowerCase()}@pathfinder.com`,
                    mobileNum: "9999999999", // Placeholder
                    whatsappNumber: "9999999999", // Placeholder
                    centre: CENTRE_NAME,
                    programme: course.programme || 'CRP',
                    class: data.classId
                }],
                course: data.courseId,
                department: course.department,
                isEnrolled: true,
                status: 'Active'
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
                baseFees: parseFloat((data.totalFees / 1.18).toFixed(2)),
                cgstAmount: parseFloat(((data.totalFees / 1.18) * 0.09).toFixed(2)),
                sgstAmount: parseFloat(((data.totalFees / 1.18) * 0.09).toFixed(2)),
                totalFees: data.totalFees,
                downPayment: data.paid,
                downPaymentStatus: "PAID",
                downPaymentMethod: "CASH",
                downPaymentReceivedDate: new Date(),
                remainingAmount: data.totalFees - data.paid,
                numberOfInstallments: data.totalFees - data.paid > 0 ? 1 : 0,
                installmentAmount: data.totalFees - data.paid,
                paymentStatus: data.totalFees - data.paid <= 0 ? "COMPLETED" : "PARTIAL",
                totalPaidAmount: data.paid,
                createdBy: ADMIN_ID,
                admissionDate: new Date(),
                sectionAllotment: {
                    omrCode: data.enroll
                }
            });
            const savedAdmission = await admission.save();

            console.log(`✅ Inserted ${data.name} (Admission: ${data.enroll})`);
        }

        console.log("\nAll 4 students inserted successfully without bill generation!");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
