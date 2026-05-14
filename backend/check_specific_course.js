import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const course = await Course.findById("6971d5858ec5b04dafc245d9").lean();
        console.log("Course Found:", course ? JSON.stringify(course, null, 2) : "NOT FOUND");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
