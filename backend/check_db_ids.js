import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from './models/Admission/Admission.js';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URL);
    const ids = ['PATH25007847'];
    for (const id of ids) {
        const adms = await Admission.find({ admissionNumber: id });
        console.log(`ID: ${id}, Found: ${adms.length}`);
        adms.forEach(a => {
            console.log(` - Session: ${a.academicSession}, Course: ${a.course?.courseName}`);
        });
    }
    await mongoose.disconnect();
}
check();
