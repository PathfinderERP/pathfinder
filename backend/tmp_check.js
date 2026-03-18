
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Assuming this is run with Cwd: backend
dotenv.config();

const Student = require('./models/Students.js');
const Course = require('./models/Master_data/Courses.js');

async function run() {
    try {
        console.log('Connecting to:', process.env.MONGO_URL);
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const student = await Student.findOne({ 
            $or: [
                { "studentsDetails.studentName": "Rohit Saha" },
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
