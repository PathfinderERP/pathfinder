
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';
import Student from './models/Students.js';

dotenv.config();

async function search() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const studentNos = ["PATH24009586", "PATH25021834", "PATH25017078", "PATH25018283"];
        
        console.log('\n--- Checking for Existing Students ---');
        for (const no of studentNos) {
            const student = await Student.findOne({ enrollmentNo: no });
            if (student) {
                console.log(`✅ Student ${no} FOUND: ${student.name}`);
            } else {
                console.log(`❌ Student ${no} NOT FOUND.`);
            }
        }

        console.log('\n--- Searching for Foundation Courses (2025-2026) ---');
        const searchTerms = [
            { class: '7', regex: /Foundation.*VII/i },
            { class: '8', regex: /Foundation.*VIII/i },
            { class: '9', regex: /Foundation.*IX/i }
        ];

        for (const term of searchTerms) {
            const courses = await Course.find({
                courseName: { $regex: term.regex },
                courseSession: '2025-2026'
            }).populate('class').lean();

            console.log(`\nResults for ${term.regex}:`);
            if (courses.length > 0) {
                courses.forEach(c => {
                    console.log(`  - ${c.courseName} | ID: ${c._id} | Session: ${c.courseSession} | Class: ${c.class?.name}`);
                });
            } else {
                console.log(`  No exact session match. Searching all sessions for ${term.regex}:`);
                 const allSessionCourses = await Course.find({
                    courseName: { $regex: term.regex }
                }).sort({ courseSession: -1 }).limit(3).populate('class').lean();
                allSessionCourses.forEach(c => {
                    console.log(`    - ${c.courseName} | ID: ${c._id} | Session: ${c.courseSession} | Class: ${c.class?.name}`);
                });
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

search();
