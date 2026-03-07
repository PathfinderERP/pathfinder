import mongoose from 'mongoose';
import Admission from './models/Admission/Admission.js';
import Student from './models/Students.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkTantu() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const studentId = "69995a467b9e87f7d11c89e1"; // Tantu Saha's ID
        const admissions = await Admission.find({ student: studentId });
        
        console.log(`Found ${admissions.length} admissions for TANTU SAHA:`);
        admissions.forEach(a => {
            console.log(`- ID: ${a._id}, Admission No: ${a.admissionNumber}, Board Course: ${a.boardCourseName}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTantu();
