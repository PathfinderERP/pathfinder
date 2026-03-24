import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import User from './models/User.js';

dotenv.config();

// ==========================================
// CONFIGURATION BLOCK - EDIT THIS EVERY TIME
// ==========================================
const STUDENT_DATA = {
    name: "BAIDIK GANGULY",
    email: "",
    mobileNum: "0000000000",
    whatsappNumber: "0000000000",
    schoolName: "", // Add if available
    classCode: "7", // Foundation - 7
    session: "2026-2027",
    centre: "KALYANI",
    programme: "CRP", // Assuming CRP
    admissionNumber: "PATH26001547",
    courseNamePart: "Foundation Class VII 2026-2027",
    admissionDateStr: "03/24/2026",
    totalAmount: 0,
    paidAmount: 0,
    admittedByName: ""
};
// ==========================================

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        // 0. Cleanup previous attempts for this student if any
        const existingStudent = await Student.findOne({ "studentsDetails.studentName": STUDENT_DATA.name });
        if (existingStudent) {
            await Student.findByIdAndDelete(existingStudent._id);
            await Admission.deleteMany({ student: existingStudent._id });
            console.log("Cleaned up previous record.");
        }

        // 1. Course lookup (Less strict matching)
        let course = await Course.findOne({ courseName: { $regex: new RegExp("Foundation Class VII[^I]", "i") } });
        if (!course) {
             // Fallback to any Foundation 7 course
             course = await Course.findOne({ courseName: { $regex: new RegExp("Foundation.*7", "i") } });
        }
        
        let courseId = course ? course._id : new mongoose.Types.ObjectId();
        
        if (!course) {
            console.log(`Course not found: ${STUDENT_DATA.courseNamePart}. Cannot proceed without proper Class/ExamTag IDs.`);
            process.exit(1);
        } else {
            console.log(`Found Course: ${course.courseName}`);
        }

        // 2. User/Employee lookup for "Admitted By"
        let createdById = null;
        if (STUDENT_DATA.admittedByName) {
             const userObj = await User.findOne({ name: { $regex: new RegExp(STUDENT_DATA.admittedByName, "i") } });
             if (userObj) {
                 createdById = userObj._id;
             } else {
                 console.log(`User not found for name: ${STUDENT_DATA.admittedByName}`);
             }
        }

        // 3. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: STUDENT_DATA.name,
                studentEmail: STUDENT_DATA.email,
                class: STUDENT_DATA.classCode,
                centre: STUDENT_DATA.centre,
                mobileNum: STUDENT_DATA.mobileNum,
                whatsappNumber: STUDENT_DATA.whatsappNumber,
                schoolName: STUDENT_DATA.schoolName,
                programme: STUDENT_DATA.programme
            }],
            status: "Active",
            isEnrolled: true
        });
        await student.save();
        console.log(`Student saved: ${student._id}`);

        // 4. Calculate Financials
        const totalAmount = STUDENT_DATA.totalAmount;
        const paidAmount = STUDENT_DATA.paidAmount;
        const remainingAmount = totalAmount - paidAmount;
        const baseFees = totalAmount / 1.18;
        const gstAmount = totalAmount - baseFees;

        const paymentStatus = remainingAmount <= 0 ? "COMPLETED" : (paidAmount > 0 ? "PARTIAL" : "PENDING");

        // 5. Create Admission Record
        const admission = new Admission({
            student: student._id,
            admissionType: "NORMAL",
            course: courseId,
            class: course ? course.class : STUDENT_DATA.classCode,
            examTag: course ? course.examTag : null,
            department: course ? course.department : null,
            centre: STUDENT_DATA.centre,
            admissionDate: new Date(STUDENT_DATA.admissionDateStr),
            admissionNumber: STUDENT_DATA.admissionNumber,
            academicSession: STUDENT_DATA.session,
            
            baseFees: baseFees,
            cgstAmount: gstAmount / 2,
            sgstAmount: gstAmount / 2,
            totalFees: totalAmount,
            downPayment: paidAmount,
            remainingAmount: remainingAmount,
            
            numberOfInstallments: remainingAmount > 0 ? 1 : 0,
            installmentAmount: remainingAmount > 0 ? remainingAmount : 0,
            
            paymentBreakdown: remainingAmount > 0 ? [{
                installmentNumber: 1,
                dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Next month
                amount: remainingAmount,
                status: "PENDING"
            }] : [],
            
            paymentStatus: paymentStatus,
            totalPaidAmount: paidAmount,
            admissionStatus: "ACTIVE",
            createdBy: createdById
        });

        await admission.save();
        console.log(`Admission created: ${admission.admissionNumber} (${paymentStatus})`);
        console.log("Insertion complete. No separate bill records were generated.");

    } catch (error) {
        console.error("Error during insertion:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

run();
