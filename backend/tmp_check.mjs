
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import Student from './models/Students.js';
import Course from './models/Master_data/Courses.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const student = await Student.findOne({ 
            $or: [
                { "studentsDetails.studentName": /Rohit Saha/i },
                { "admissionNumber": "PATH25007038" }
            ]
        });
        console.log('STUDENT_RESULT:', JSON.stringify(student, null, 2));

        const courses = await Course.find({ 
            courseName: { $regex: /NEET 2YR CRP/i } 
        });
        console.log('COURSE_RESULT:', JSON.stringify(courses, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
