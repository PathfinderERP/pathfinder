
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Payment from './models/Payment/Payment.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        
        const student = await Student.findOne({ "studentsDetails.studentName": "SOURITA MITRA" });
        const admission = await Admission.findOne({ admissionNumber: "PATH25022614" });
        const payment = await Payment.findOne({ admission: admission?._id });
        
        console.log('--- STUDENT ---');
        console.log(JSON.stringify(student, null, 2));
        console.log('--- ADMISSION ---');
        console.log(JSON.stringify(admission, null, 2));
        console.log('--- PAYMENT ---');
        console.log(JSON.stringify(payment, null, 2));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
run();
