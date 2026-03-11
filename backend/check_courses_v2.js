import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        const names = [
            'Foundation Class X (Outstation) 2026-2027',
            'Foundation Class VIII (Out-station) 2026-2027',
            'Foundation Class IX (Out-station) 2026-2027'
        ];

        for (const name of names) {
            const course = await Course.findOne({ courseName: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
            if (course) {
                console.log('FOUND:', name, 'ID:', course._id, 'DEPT:', course.department, 'TAG:', course.examTag, 'CLASS:', course.class);
            } else {
                console.log('NOT FOUND:', name);
                const loose = name.split(' (')[0];
                const matches = await Course.find({ courseName: new RegExp(loose, 'i') });
                console.log('LOOSE MATCHES for', loose, ':', matches.map(m => m.courseName + ' (' + m._id + ')'));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
