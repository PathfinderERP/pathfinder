import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from './models/Admission/Admission.js';

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const nullCourseDoc = await Admission.findOne({ admissionType: "NORMAL", course: null }).lean();
        if (nullCourseDoc) {
            console.log("Keys in null course doc:", Object.keys(nullCourseDoc));
            console.log("Full Doc:", JSON.stringify(nullCourseDoc, null, 2));
        } else {
            console.log("No null course doc found");
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
