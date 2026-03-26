import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const query = { courseName: "Madhyamik CRP Class IX Tuition Fee For All 7 Sub. 2026-2027" };
        const course = await Course.findOne(query);
        
        if (course) {
            console.log(`Found course: ID: ${course._id}, Name: ${course.courseName}, Class: ${course.class}`);
        } else {
            console.log("No exact match found.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
