
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Course from './models/Master_data/Courses.js';
import Lead from './models/LeadManagement.js';
import Student from './models/Students.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        
        console.log("Searching for Course...");
        const course = await Course.findOne({ courseName: "JEE MAINS & ADV. (NS)+WBJEE 2Years 2025-2027" });
        console.log("Course Found:", course);

        if (!course) {
            console.log("Searching for partial match...");
            const partial = await Course.find({ courseName: /JEE MAINS & ADV/i });
            console.log("Partial matches:", partial);
        }

        console.log("\nSearching for PRATIK in Leads...");
        const leads = await Lead.find({ studentName: /PRATIK/i });
        console.log("Leads found:", leads);

        console.log("\nSearching for PRATIK in Students...");
        const students = await Student.find({ name: /PRATIK/i });
        console.log("Students found:", students);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
run();
