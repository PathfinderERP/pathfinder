import "dotenv/config";
import mongoose from 'mongoose';
import Course from './models/Master_data/Courses.js';
import Admission from './models/Admission/Admission.js';

const MONGO_URL = process.env.MONGO_URL;

async function checkDetails() {
    try {
        await mongoose.connect(MONGO_URL);
        const courseId = "698ecacccc716f7a61ea074e";
        const course = await Course.findById(courseId);
        console.log("Course Details:");
        console.log(JSON.stringify(course, null, 2));

        const otherStuds = await Admission.find({ course: courseId }).limit(5);
        if (otherStuds.length > 0) {
            console.log("Other students in this course belong to these centres:");
            otherStuds.forEach(a => console.log(`  - ${a.centre}`));
        } else {
            console.log("No other students found in this course.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDetails();
