import mongoose from 'mongoose';
import Student from './models/Students.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDuplicates() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const namesToCheck = ["SONAKSHI HAIT", "TANTU SAHA"];
        
        for (const name of namesToCheck) {
            const students = await Student.find({ "studentsDetails.studentName": new RegExp(`^${name}$`, 'i') });
            console.log(`\nName: ${name} - Found ${students.length} records`);
            students.forEach(s => {
                console.log(`- ID: ${s._id}, Mobile: ${s.mobNum}, Parent: ${s.parentDetails?.[0]?.fatherName}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDuplicates();
