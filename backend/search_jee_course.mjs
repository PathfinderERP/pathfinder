
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Course from './models/Master_data/Courses.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const courses = await Course.find({
            courseName: { $regex: /2025-2027/i },
            courseName: { $regex: /NCRP/i }
        }, 'courseName');
        
        console.log(JSON.stringify(courses, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
run();
