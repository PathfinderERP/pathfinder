import mongoose from 'mongoose';
import Admission from './backend/models/Admission/Admission.js';
import Course from './backend/models/Master_data/Courses.js';
import Student from './backend/models/Students.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function checkAdmissions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const admissions = await Admission.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('course')
            .populate('student');

        console.log(`Found ${admissions.length} admissions`);

        admissions.forEach((adm, i) => {
            console.log(`\n--- Admission ${i + 1} ---`);
            console.log(`ID: ${adm._id}`);
            console.log(`Number: ${adm.admissionNumber}`);
            console.log(`Type: ${adm.admissionType}`);
            console.log(`Course: ${adm.course ? (adm.course.courseName || 'Populated but no name') : 'Not populated'}`);
            console.log(`Board Course Name: ${adm.boardCourseName}`);
            console.log(`Student populated: ${!!adm.student}`);
            if (adm.student && adm.student.studentsDetails) {
                console.log(`Student Name: ${adm.student.studentsDetails[0].studentName}`);
            }
        });

        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    } catch (error) {
        console.error("Error:", error);
    }
}

checkAdmissions();
