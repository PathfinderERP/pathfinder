import mongoose from 'mongoose';
import Admission from './models/Admission/Admission.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const startDate = new Date("2026-04-30T00:00:00Z");
        const endDate = new Date("2026-05-15T23:59:59Z");

        const normalCount = await Admission.countDocuments({
            admissionDate: { $gte: startDate, $lte: endDate }
        });

        const boardCount = await BoardCourseAdmission.countDocuments({
            admissionDate: { $gte: startDate, $lte: endDate }
        });

        console.log(`Normal Admissions (all) between ${startDate.toISOString()} and ${endDate.toISOString()}: ${normalCount}`);
        console.log(`Board Course Admissions: ${boardCount}`);

        if (normalCount > 0) {
            const sample = await Admission.findOne({
                admissionDate: { $gte: startDate, $lte: endDate }
            }).lean();
            console.log("Sample Normal Admission Centre:", sample.centre);
            console.log("Sample Normal Admission Status:", sample.admissionStatus);
            console.log("Sample Normal Admission Type:", sample.admissionType);
            console.log("Sample Normal Admission Date:", sample.admissionDate);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkData();
