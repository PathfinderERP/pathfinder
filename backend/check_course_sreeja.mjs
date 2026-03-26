import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const query = { courseName: { $regex: /Foundation.*Class IX.*2025-2026/i } };
        const courses = await Course.find(query);
        
        if (courses.length > 0) {
            console.log("Found courses:");
            courses.forEach(c => {
                console.log(`- ID: ${c._id}, Name: ${c.courseName}, Class: ${c.class}, ExamTag: ${c.examTag}, Department: ${c.department}`);
            });
        } else {
            console.log("No courses found matching the pattern.");
            // Try broader search
            const allFoundations = await Course.find({ courseName: { $regex: /Foundation/i } });
            console.log(`Found ${allFoundations.length} total Foundation courses.`);
            allFoundations.slice(0, 10).forEach(c => console.log(`- ${c.courseName}`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
