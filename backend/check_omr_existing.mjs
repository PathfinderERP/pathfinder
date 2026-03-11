import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from './models/Admission/Admission.js';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const ids = ['PATH26001574', 'PATH26001584', 'PATH26001554'];
        const admissions = await Admission.find({ admissionNumber: { $in: ids } }).populate('student');

        if (admissions.length === 0) {
            console.log("No existing records found for these OMR numbers.");
        } else {
            console.log(JSON.stringify(admissions.map(a => ({
                id: a.admissionNumber,
                found: !!a.student,
                name: a.student?.studentsDetails?.[0]?.studentName,
                phone: a.student?.studentsDetails?.[0]?.mobileNum
            })), null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
