import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from './models/Admission/Admission.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Student from './models/Students.js';

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const student = await Student.findOne({ "studentsDetails.studentName": /ARCHIT MUKHERJEE/i });
        if (!student) {
            console.log("Student not found");
            process.exit();
        }

        console.log("Student ID:", student._id);

        const normalAdmissions = await Admission.find({ student: student._id }).lean();
        console.log("Normal Admissions:", JSON.stringify(normalAdmissions.map(a => ({
            id: a._id,
            course: a.course,
            admissionType: a.admissionType,
            admissionNumber: a.admissionNumber,
            department: a.department
        })), null, 2));

        const boardAdmissions = await BoardCourseAdmission.find({ studentId: student._id }).lean();
        console.log("Board Admissions:", JSON.stringify(boardAdmissions.map(a => ({
            id: a._id,
            boardId: a.boardId,
            admissionNumber: a.admissionNumber
        })), null, 2));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
