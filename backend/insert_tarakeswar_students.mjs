import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Malay Maity
const CENTRE_NAME = "TARAKESWAR";

const studentsData = [
    {
        name: "Anish Ghosh",
        omrNo: "PATH26001574",
        email: "anish.ghosh@gmail.com",
        phone: "9749246061",
        courseId: "6971d4707b7d1cb9d0af9e4f", // NEET 2Years 2026-2028
        class: "XI studying"
    },
    {
        name: "Antara Dey",
        omrNo: "PATH26001584",
        email: "arupratandey@gmail.com",
        phone: "9474126993",
        courseId: "6971d4707b7d1cb9d0af9e4f", // NEET 2Years 2026-2028
        class: "XI studying"
    },
    {
        name: "Shuvam Dutta",
        omrNo: "PATH26001554",
        email: "shuvam.dutta@gmail.com",
        phone: "7679859879",
        courseId: "6971d4707b7d1cb9d0af9e6b", // FOUNDATION CLASS VII Online 2026-2027
        class: "VII"
    }
];

async function insertData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        for (const data of studentsData) {
            console.log(`Processing student: ${data.name}...`);

            // 1. Create Student
            const student = new Student({
                studentsDetails: [{
                    studentName: data.name,
                    studentEmail: data.email,
                    mobileNum: data.phone,
                    whatsappNumber: data.phone, // Assuming whatsapp is same as mobile
                    centre: CENTRE_NAME,
                    programme: 'CRP'
                }],
                isEnrolled: true,
                status: 'Active'
            });
            const savedStudent = await student.save();

            // Fetch Course for mapping details
            const course = await Course.findById(data.courseId);
            if (!course) throw new Error(`Course not found for ID: ${data.courseId}`);

            // 2. Create Admission
            const admission = new Admission({
                student: savedStudent._id,
                admissionType: "NORMAL",
                course: data.courseId,
                class: course.class,
                examTag: course.examTag,
                department: course.department,
                centre: CENTRE_NAME,
                admissionNumber: data.omrNo,
                academicSession: (data.omrNo.includes("26") ? "2026-2027" : "2025-2026"), // Heuristically set
                baseFees: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                totalFees: 0,
                downPayment: 0,
                remainingAmount: 0,
                numberOfInstallments: 0,
                installmentAmount: 0,
                paymentStatus: "COMPLETED",
                totalPaidAmount: 0,
                createdBy: ADMIN_ID,
                sectionAllotment: {
                    omrCode: data.omrNo
                }
            });
            // Override session if needed based on course name
            if (course.courseName.includes("2026-2028")) {
                admission.academicSession = "2026-2028";
            } else if (course.courseName.includes("2026-2027")) {
                admission.academicSession = "2026-2027";
            }

            await admission.save();
            console.log(`✅ Inserted ${data.name} (Admission/OMR: ${data.omrNo})`);
        }

        console.log("\nAll Tarakeswar students inserted successfully!");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
