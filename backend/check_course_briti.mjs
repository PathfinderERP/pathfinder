import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const query = { courseName: { $regex: /Madhyamik.*Class IX.*2026-2027/i } };
        const courses = await Course.find(query);
        
        if (courses.length > 0) {
            console.log("Found courses:");
            courses.forEach(c => {
                console.log(`- ID: ${c._id}, Name: ${c.courseName}, Class: ${c.class}`);
            });
        } else {
            console.log("No courses found matching the pattern.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
