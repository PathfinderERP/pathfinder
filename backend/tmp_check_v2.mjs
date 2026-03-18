
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import Student from './models/Students.js';
import Course from './models/Master_data/Courses.js';
import Board from './models/Master_data/Boards.js';
import Admission from './models/Admission/Admission.js';

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
        console.log('STUDENT_SEARCH:', student ? student._id : 'Not Found');

        const admission = await Admission.findOne({ admissionNumber: "PATH25007038" });
        console.log('ADMISSION_SEARCH:', admission ? admission._id : 'Not Found');

        const courses = await Course.find({ 
            courseName: /NEET/i 
        }, 'courseName');
        console.log('COURSES_FOUND:', courses.map(c => c.courseName));

        const boards = await Board.find({ 
            boardCourse: /NEET/i 
        }, 'boardCourse');
        console.log('BOARDS_FOUND:', boards.map(b => b.boardCourse));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
