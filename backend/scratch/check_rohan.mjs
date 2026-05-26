import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/HR/Employee.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function checkRohan() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        const sampleEmployee = await Employee.findOne({});
        console.log("\n--- Sample Employee Record ---");
        if (sampleEmployee) {
            const obj = sampleEmployee.toObject();
            // Delete potentially long fields to keep output concise
            delete obj.salaryStructure;
            delete obj.letters;
            delete obj.workingDays;
            console.log(obj);
        } else {
            console.log("No employees found");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkRohan();
