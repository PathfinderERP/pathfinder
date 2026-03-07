import mongoose from 'mongoose';
import Admission from './models/Admission/Admission.js';
import Student from './models/Students.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAdmission() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const admissionNumber = "PATH26001167";
        const admissions = await Admission.find({ admissionNumber }).populate('student', 'name email');
        
        console.log(`Found ${admissions.length} admissions with number ${admissionNumber}:`);
        admissions.forEach(a => {
            console.log(`- ID: ${a._id}, Student: ${a.student?.name} (${a.student?._id}), Centre: ${a.centre}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAdmission();
