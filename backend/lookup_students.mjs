import mongoose from 'mongoose';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';

await mongoose.connect('mongodb://localhost:27017/pathfinderERP');

const searches = [
    { name: 'AYUSHMAN HALDAR', email: 'anindita.banerjeehaldar@gmail.com' },
    { name: 'SHAMBHAVI CHOUDHURY', email: 'saheli.Dutta@gmail.com' },
    { name: 'NEHA MANNA', email: 'nehamanna@gmail.com' },
    { name: 'AMRITA PAUL', email: 'amritapaul875@gmail.com' },
    { name: 'aryan ray', email: 'aryanroyjee@gamil.com' }
];

for (const s of searches) {
    const byEmail = await Student.findOne({
        $or: [
            { 'studentsDetails.studentEmail': { $regex: s.email, $options: 'i' } },
            { 'mobileNum': { $regex: s.email.substring(0, 5), $options: 'i' } }
        ]
    }).lean();

    const byName = await Student.findOne({
        'studentsDetails.studentName': { $regex: s.name, $options: 'i' }
    }).lean();

    const found = byEmail || byName;
    console.log('---');
    console.log('Search:', s.name);
    if (found) {
        console.log('Found Student ID:', found._id);
        console.log('Name:', found.studentsDetails?.[0]?.studentName);
        console.log('Email:', found.studentsDetails?.[0]?.studentEmail);
        console.log('Admission Number:', found.admissionNumber);
        // Get admissions
        const admissions = await Admission.find({ student: found._id }).populate('course').lean();
        console.log('Admissions:', admissions.map(a => ({ id: a._id, course: a.course?.courseName, session: a.academicSession, totalFees: a.totalFees, totalPaid: a.totalPaidAmount })));
    } else {
        console.log('NOT FOUND in database');
    }
}

// Also search courses
console.log('\n--- COURSE SEARCH ---');
const courseNames = [
    'NCRP NEET 2Years WSM 2025-2027',
    'Foundation(NS) Class VII (Out-station) 2025-2026',
    'Foundation (NS) Class VIII (Out-station) 2025-2026',
    'Foundation (NS) Class IX (Out-station) 2025-2026',
    'Foundation Class VIII (Instation) 2026-2027'
];

for (const cn of courseNames) {
    const words = cn.split(' ').slice(0, 3).join(' ');
    const course = await Course.findOne({ courseName: { $regex: words, $options: 'i' } }).lean();
    console.log(cn, '->', course ? `ID: ${course._id} | ${course.courseName}` : 'NOT FOUND');
}

await mongoose.disconnect();
