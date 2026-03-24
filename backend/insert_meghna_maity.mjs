import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        // 0. Cleanup previous attempts if any
        const existingStudent = await Student.findOne({ "studentsDetails.studentName": "MEGHNA MAITY" });
        if (existingStudent) {
            await Student.findByIdAndDelete(existingStudent._id);
            await Admission.deleteMany({ student: existingStudent._id });
            console.log("Cleaned up previous record.");
        }

        const courseName = "Madhyamik CRP Class IX 2026-2027";
        let course = await Course.findOne({ courseName: { $regex: new RegExp(courseName, "i") } });
        let courseId = course ? course._id : new mongoose.Types.ObjectId();
        
        if (!course) {
            console.log(`Course not found: ${courseName}. Proceeding with dummy ID.`);
        }

        const centreName = "BEHALA";
        const admissionNumber = "PATH20001601";
        const totalAmount = 50000;

        // 1. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: "MEGHNA MAITY",
                class: "9",
                centre: centreName,
                mobileNum: "9999999999", // placeholder since not provided
                whatsappNumber: "9999999999",
                schoolName: "SREE SARADA ASHRAMA BALIKA",
                programme: "CRP"
            }],
            status: "Active",
            isEnrolled: true
        });
        await student.save();
        console.log("Student saved:", student._id);

        // 2. Create Admission Record (Fully Paid, No Bill Generation)
        const admission = new Admission({
            student: student._id,
            admissionType: "NORMAL",
            course: courseId,
            class: course ? course.class : null,
            examTag: course ? course.examTag : null,
            department: course ? course.department : null,
            centre: centreName,
            admissionDate: new Date(),
            admissionNumber: admissionNumber,
            academicSession: "2026-2027",
            baseFees: totalAmount / 1.18,
            cgstAmount: (totalAmount - (totalAmount / 1.18)) / 2,
            sgstAmount: (totalAmount - (totalAmount / 1.18)) / 2,
            totalFees: totalAmount,
            downPayment: totalAmount, // Full Paid
            remainingAmount: 0,
            numberOfInstallments: 0,
            installmentAmount: 0,
            paymentBreakdown: [],
            paymentStatus: "COMPLETED",
            totalPaidAmount: totalAmount,
            admissionStatus: "ACTIVE",
            createdBy: null
        });

        await admission.save();
        console.log("Admission created:", admission.admissionNumber);
        console.log("Done insertion. No bills generated as requested.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

run();
