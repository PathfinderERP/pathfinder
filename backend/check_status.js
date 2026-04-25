
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function checkStudentStatus() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const targetIds = ["PATH26002639", "PATH26002638", "PATH26002636"];
        
        const admissions = await BoardCourseAdmission.find({
            admissionNumber: { $in: targetIds }
        }).lean();

        for (const adm of admissions) {
            const student = await Student.findById(adm.studentId).lean();
            console.log(`Student: ${student.studentsDetails?.[0]?.studentName}, isEnrolled: ${student.isEnrolled}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkStudentStatus();
