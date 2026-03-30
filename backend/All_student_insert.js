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
const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Default Admin: Malay Maity
const GENERATE_BILL = false; // Set to true if payment records/bills are needed

/**
 * PASTE STUDENT DATA HERE
 */
const student_data_list = [
    {
        enroll: "PATH26001582",
        name: "Abhirup Pal",
        email: "abhiruppal@example.com",
        phone: "0000000000",
        centre: "CHANDANNAGAR",
        courseName: "Foundation Class VIII (Out-station) 2026-2027",
        session: "2026-2027",
        totalFees: 20000,
        paid: 0,
        counselledBy: "Direct Admission"
    }
];

async function insertAllStudents() {
    try {
        if (!MONGO_URL) throw new Error("MONGO_URL not found in .env");
        if (student_data_list.length === 0) {
            console.warn("⚠️ No students found in student_data_list. Please add data and run again.");
            return;
        }

        await mongoose.connect(MONGO_URL);
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
