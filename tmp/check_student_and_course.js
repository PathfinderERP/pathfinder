
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Student = require('../backend/models/Students.js');
const Course = require('../backend/models/Master_data/Courses.js');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const student = await Student.findOne({ 
            $or: [
                { "studentsDetails.studentName": "Rohit Saha" },
                { "admissionNumber": "PATH25007038" }
            ]
        });
        console.log('Student found:', JSON.stringify(student, null, 2));

        const courses = await Course.find({ 
            courseName: { $regex: /NEET 2YR CRP/i } 
        });
        console.log('Courses found:', JSON.stringify(courses, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
