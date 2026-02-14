
import mongoose from 'mongoose';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function verify() {
    try {
        await mongoose.connect(MONGO_URL);

        const session = "2026-2027";

        const count = await Admission.countDocuments({ academicSession: session });
        console.log(`Total Admissions for session ${session}: ${count}`);

    } catch (error) {
        console.error("Verification Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
