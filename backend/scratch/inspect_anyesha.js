import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';
import Payment from '../models/Payment/Payment.js';
import Centre from '../models/Master_data/Centre.js';

async function inspectStudent() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const student = await Student.findOne({ admissionNo: "PATH25000956" }).lean() ||
                        await Student.findOne({ "studentsDetails.studentName": /ANYESHA/i }).lean();

        console.log("--- STUDENT RECORD ---");
        console.log(JSON.stringify(student, null, 2));

        if (!student) {
            console.log("Student not found by admissionNo PATH25000956, searching Admissions directly...");
        }

        const admissions = await Admission.find({ admissionNumber: "PATH25000956" }).lean();
        console.log("--- ADMISSION RECORDS ---");
        console.log(JSON.stringify(admissions, null, 2));

        if (admissions.length > 0) {
            const admId = admissions[0]._id;
            const payments = await Payment.find({ admission: admId }).lean();
            console.log("--- EXISTING PAYMENTS ---");
            console.log(JSON.stringify(payments, null, 2));
        }

        const behalaCentre = await Centre.findOne({ centreName: /BEHALA/i }).lean();
        console.log("--- BEHALA CENTRE ---");
        console.log(behalaCentre);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectStudent();
