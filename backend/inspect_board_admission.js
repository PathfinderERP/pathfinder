import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const boardDoc = await BoardCourseAdmission.findOne({}).lean();
        if (boardDoc) {
            console.log("Full Board Doc:", JSON.stringify(boardDoc, null, 2));
        } else {
            console.log("No board doc found");
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
