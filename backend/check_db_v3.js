import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Course from './models/Master_data/Courses.js';
import Department from './models/Master_data/Department.js';
import ExamTag from './models/Master_data/ExamTag.js';
import Class from './models/Master_data/Class.js';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        const courseNames = [
            'Foundation Class X',
            'Foundation Class VIII',
            'Foundation Class IX'
        ];

        const results = {};

        for (const name of courseNames) {
            const courseList = await Course.find({ courseName: new RegExp(name, 'i') })
                .populate('department')
                .populate('examTag')
                .populate('class');
            results[name] = courseList.map(c => ({
                id: c._id,
                name: c.courseName,
                dept: c.department?._id,
                examTag: c.examTag?._id,
                class: c.class?._id,
                fees: c.feesStructure
            }));
        }

        const studentIds = ['PATH25024000', 'PATH25023087', 'PATH25023174', 'PATH25024337'];
        const studentChecks = {};
        for (const id of studentIds) {
            const admission = await Admission.findOne({ admissionNumber: id }).populate('student');
            studentChecks[id] = admission ? {
                id: admission._id,
                studentId: admission.student?._id,
                name: admission.student?.studentsDetails?.[0]?.studentName,
                course: admission.course
            } : null;
        }

        console.log(JSON.stringify({ courses: results, students: studentChecks }, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
