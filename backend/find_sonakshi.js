import mongoose from 'mongoose';
import Admission from './models/Admission/Admission.js';
import Student from './models/Students.js';
import dotenv from 'dotenv';

dotenv.config();

async function findSonakshi() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // First find the student ID for Sonakshi Hait
        const students = await Student.find({ "studentsDetails.studentName": /SONAKSHI HAIT/i });
        console.log(`Found ${students.length} students matching 'SONAKSHI HAIT'`);

        for (const student of students) {
            console.log(`\nStudent: ${student.studentsDetails?.[0]?.studentName} (${student._id})`);
            const admissions = await Admission.find({ student: student._id });
            console.log(`Found ${admissions.length} admissions:`);
            admissions.forEach(a => {
                console.log(`- ID: ${a._id}, Admission No: ${a.admissionNumber}, Course: ${a.course?.courseName || a.boardCourseName}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findSonakshi();
