import mongoose from 'mongoose';
import Student from './models/Students.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkStudent() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const studentId = "69995a467b9e87f7d11c89e1";
        const student = await Student.findById(studentId);
        
        if (student) {
            console.log(`Student Found:`);
            console.log(`- Name: ${student.studentsDetails?.[0]?.studentName}`);
            console.log(`- Email: ${student.email}`);
            console.log(`- Mobile: ${student.mobNum}`);
        } else {
            console.log("Student not found.");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkStudent();
