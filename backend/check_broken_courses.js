import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from './models/Admission/Admission.js';

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const broken = await Admission.find({ 
            admissionType: "NORMAL",
            course: { $exists: false }
        }).lean();
        console.log("Admissions missing course field:", broken.length);

        const nullCourse = await Admission.find({ 
            admissionType: "NORMAL",
            course: null
        }).lean();
        console.log("Admissions with null course field:", nullCourse.length);

        const allNormal = await Admission.find({ admissionType: "NORMAL" }).limit(5).lean();
        console.log("Sample Normal Admissions:", JSON.stringify(allNormal.map(a => ({
            id: a._id,
            course: a.course,
            courseType: typeof a.course
        })), null, 2));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
