import mongoose from 'mongoose';
import Course from './models/Master_data/Courses.js';
import dotenv from 'dotenv';

dotenv.config();

async function findCourse() {
    await mongoose.connect(process.env.MONGO_URL);
    const courses = await Course.find({ name: /NEET REPEATER/i });
    console.log(JSON.stringify(courses, null, 2));
    await mongoose.disconnect();
}

findCourse();
