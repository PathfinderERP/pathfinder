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

/**
 * PASTE STUDENT DATA HERE
 * Provide the 'enroll' (admission number) to find the existing student.
 */
const student_data_list = [
    {
        enroll: "PATH24003042", // Existing student's admission number
        courseName: "CRP NEET 2Years 2024-2026", // The new course to allocate
        session: "2024-2026",
        totalFees: 65600,
        paid: 55600,
        centre: "BAGNAN",
        counselledBy: "Lipi Chattaraj"
    }
];

async function allocateNewCoursesToStudents() {
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
            console.log(`🚀 Processing Allocation for: ${data.enroll}`);

            try {
                // 1. Find Existing Student by Admission Number
                const previousAdmission = await Admission.findOne({ admissionNumber: data.enroll });

                if (!previousAdmission || !previousAdmission.student) {
                    console.error(`❌ Student with enroll ${data.enroll} not found in Admissions. Skipping.`);
                    continue;
                }

                const studentId = previousAdmission.student;
                console.log(`✅ Found existing Student ID: ${studentId}`);

                // 2. Resolve New Course Details
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

                // 3. Update Existing Student Record (Optional - update to the latest course/department)
                await Student.findByIdAndUpdate(studentId, {
                    course: course._id,
                    department: course.department?._id,
                    counselledBy: data.counselledBy || previousAdmission.counselledBy
                });
                console.log(`✅ Student Record Updated with New Course Details`);

                // 4. Calculate Financials
                const totalFees = data.totalFees || 0;
                const paid = data.paid || 0;
                const baseFees = parseFloat((totalFees / 1.18).toFixed(2));
                const cgst = parseFloat((baseFees * 0.09).toFixed(2));
                const sgst = parseFloat((baseFees * 0.09).toFixed(2));

                // 5. Create New Admission Record for the New Course
                const newAdmission = new Admission({
                    student: studentId,
                    admissionType: "NORMAL",
                    course: course._id,
                    class: course.class?._id,
                    examTag: course.examTag?._id,
                    department: course.department?._id,
                    centre: data.centre || previousAdmission.centre || "BAGNAN",
                    admissionNumber: data.enroll, // Ensure the same enroll number is carried forward
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
                await newAdmission.save();
                console.log(`✅ New Admission Record Created for ${data.enroll} in course ${course.courseName}`);

            } catch (studentErr) {
                console.error(`❌ Failed to process allocation for ${data.enroll}:`, studentErr.message);
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

allocateNewCoursesToStudents();
