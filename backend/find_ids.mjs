import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function findData() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const Centre = mongoose.model('Centre', new mongoose.Schema({}, { strict: false }), 'centres');
        const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');
        const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }), 'departments');
        const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }), 'sessions');
        const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }), 'classes');

        const centre = await Centre.findOne({ centreName: /HAZRA/i });
        const courseIX = await Course.findOne({ courseName: /Madhyamik CRP/i, courseName: /Class IX/i, courseName: /All 7 Sub/i });
        const courseX = await Course.findOne({ courseName: /Madhyamik CRP/i, courseName: /Class X/i, courseName: /All 7 Sub/i });
        const dept = await Department.findOne({ departmentName: /CRP/i });
        const sess = await Session.findOne({ sessionName: /2026-2027/i });
        const cls9 = await Class.findOne({ className: /9/i });
        const cls10 = await Class.findOne({ className: /10/i });

        console.log('--- Centre ---');
        console.log(centre ? `${centre.centreName}: ${centre._id}` : 'Centre not found');

        console.log('\n--- Department ---');
        console.log(dept ? `${dept.departmentName}: ${dept._id}` : 'Dept not found');

        console.log('\n--- Session ---');
        console.log(sess ? `${sess.sessionName}: ${sess._id}` : 'Session not found');

        console.log('\n--- Class 9 ---');
        console.log(cls9 ? `${cls9.className}: ${cls9._id}` : 'Class 9 not found');

        console.log('\n--- Class 10 ---');
        console.log(cls10 ? `${cls10.className}: ${cls10._id}` : 'Class 10 not found');

        console.log('\n--- Course IX ---');
        console.log(courseIX ? `${courseIX.courseName}: ${courseIX._id}` : 'Course IX not found');

        console.log('\n--- Course X ---');
        console.log(courseX ? `${courseX.courseName}: ${courseX._id}` : 'Course X not found');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

findData();
