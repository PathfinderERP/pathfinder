import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from './backend/models/Admission/Admission.js';
import BoardCourseAdmission from './backend/models/Admission/BoardCourseAdmission.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        const todayStart = new Date("2026-06-16T00:00:00.000Z");
        const todayEnd = new Date("2026-06-16T23:59:59.999Z");

        const dateQuery = { admissionDate: { $gte: todayStart, $lte: todayEnd } };

        // 1. Count Normal Admissions
        const normalCount = await Admission.countDocuments(dateQuery);
        // 2. Count Board Admissions
        const boardCount = await BoardCourseAdmission.countDocuments(dateQuery);

        console.log("Database Ground Truth for 2026-06-16:");
        console.log("---------------------------------------");
        console.log(`Normal Admissions (Admission): ${normalCount}`);
        console.log(`Board Admissions (BoardCourseAdmission): ${boardCount}`);
        console.log(`Total Combined: ${normalCount + boardCount}`);

        // Group Normal Admissions by academicSession
        const normalBySession = await Admission.aggregate([
            { $match: dateQuery },
            { $group: { _id: "$academicSession", count: { $sum: 1 } } }
        ]);
        console.log("\nNormal Admissions by Academic Session:");
        console.log(normalBySession);

        // Group Board Admissions by academicSession
        const boardBySession = await BoardCourseAdmission.aggregate([
            { $match: dateQuery },
            { $group: { _id: "$academicSession", count: { $sum: 1 } } }
        ]);
        console.log("\nBoard Admissions by Academic Session:");
        console.log(boardBySession);

        // Group Normal Admissions by status / paymentStatus
        const normalByStatus = await Admission.aggregate([
            { $match: dateQuery },
            { $group: { _id: { paymentStatus: "$paymentStatus", status: "$admissionStatus" }, count: { $sum: 1 } } }
        ]);
        console.log("\nNormal Admissions by Status:");
        console.log(normalByStatus);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
