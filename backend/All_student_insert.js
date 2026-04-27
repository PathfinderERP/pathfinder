import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import Department from './models/Master_data/Department.js';
import ClassRecord from './models/Master_data/Class.js';
import ExamTag from './models/Master_data/ExamTag.js';

dotenv.config();

/**
 * CONFIGURATION
 */
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW";
const ADMIN_ID = "69ccfffdd74b678e3a08afc3"; // Default Admin: Malay Maity
const GENERATE_BILL = false; // Set to true if payment records/bills are needed

/**
 * PASTE STUDENT DATA HERE
 */
const student_data_list = [
    {
        enroll: "PATH24011110",
        name: "HAIMANTI PARAMANIK",
        email: "abhaykumarpramanik@gmail.com",
        phone: "8250305879",
        centre: "BURDWAN",
        courseName: "Foundation (NS)Class X (Instation) 2025-2026",
        session: "2025-2026",
        totalFees: 0,
        paid: 0,
        counselledBy: "Lipi Chattaraj"
    },
    {
        enroll: "PATH24008945",
        name: "SHUBHAM GHOSH",
        email: "tapanmrai@gmail.com",
        phone: "9732082910",
        centre: "BURDWAN",
        courseName: "NCRP NEET 2Years WSM 2025-2027",
        session: "2025-2027",
        totalFees: 0,
        paid: 0,
        counselledBy: "Lipi Chattaraj"
    }
];

async function insertAllStudents() {
    try {
        if (!MONGO_URL) throw new Error("MONGO_URL not found in .env");
        if (student_data_list.length === 0) {
            console.warn("⚠️ No students found in student_data_list. Please add data and run again.");
            return;
        }

        const options = {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4,
            connectTimeoutMS: 30000,
        };
        await mongoose.connect(MONGO_URL, options);
        console.log("Connected to MongoDB.");

        for (const data of student_data_list) {
            console.log(`\n-----------------------------------------`);
            console.log(`🚀 Processing: ${data.name} (${data.enroll})`);

            try {
                // 1. Resolve Course Details
                const course = await Course.findOne({
                    $or: [
                        { courseName: data.courseName },
                        { _id: mongoose.isValidObjectId(data.courseId) ? data.courseId : null }
                    ]
                }).populate('class department examTag');

                if (!course) {
                    console.error(`❌ Course not found: ${data.courseName || data.courseId}. Skipping.`);
                    continue;
                }

                // 2. Create/Save Student Record
                const student = new Student({
                    studentsDetails: [{
                        studentName: data.name,
                        studentEmail: data.email || `${data.enroll.toLowerCase()}@pathfinder.com`,
                        mobileNum: data.phone || "9999999999",
                        whatsappNumber: data.phone || "9999999999",
                        centre: data.centre || "BAGNAN",
                        programme: course.programme || 'CRP',
                        class: course.class?._id || data.classId
                    }],
                    course: course._id,
                    department: course.department?._id,
                    isEnrolled: true,
                    status: 'Active',
                    counselledBy: data.counselledBy || ""
                });
                const savedStudent = await student.save();
                console.log(`✅ Student Record Created: ${savedStudent._id}`);

                // 3. Calculate Financials
                const totalFees = data.totalFees || 0;
                const paid = data.paid || 0;
                const baseFees = parseFloat((totalFees / 1.18).toFixed(2));
                const cgst = parseFloat((baseFees * 0.09).toFixed(2));
                const sgst = parseFloat((baseFees * 0.09).toFixed(2));

                // 4. Create Admission Record
                const admission = new Admission({
                    student: savedStudent._id,
                    admissionType: "NORMAL",
                    course: course._id,
                    class: course.class?._id,
                    examTag: course.examTag?._id,
                    department: course.department?._id,
                    centre: data.centre || "BAGNAN",
                    admissionNumber: data.enroll,
                    academicSession: data.session || course.courseSession || "2026-2027",
                    baseFees: baseFees,
                    cgstAmount: cgst,
                    sgstAmount: sgst,
                    totalFees: totalFees,
                    downPayment: paid,
                    downPaymentStatus: "PAID",
                    downPaymentMethod: "CASH",
                    downPaymentReceivedDate: new Date(),
                    remainingAmount: totalFees - paid,
                    numberOfInstallments: (totalFees - paid > 0) ? 1 : 0,
                    installmentAmount: totalFees - paid,
                    paymentStatus: (totalFees - paid <= 0) ? "COMPLETED" : "PARTIAL",
                    totalPaidAmount: paid,
                    createdBy: ADMIN_ID,
                    admissionDate: new Date(),
                    sectionAllotment: {
                        omrCode: data.enroll
                    }
                });
                await admission.save();
                console.log(`✅ Admission Record Created for ${data.enroll}`);

                // 5. Optional Payment/Bill Generation (Not requested usually)
                if (GENERATE_BILL && paid > 0) {
                    console.log("ℹ️ Bill generation is currently disabled in this script configuration.");
                }

            } catch (studentErr) {
                console.error(`❌ Failed to insert ${data.name}:`, studentErr.message);
            }
        }

        console.log(`\n=========================================`);
        console.log(`🎉 Batch processing complete.`);

    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertAllStudents();
