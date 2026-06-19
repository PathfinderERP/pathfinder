import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Class from '../models/Master_data/Class.js';
import Session from '../models/Master_data/Session.js';
import Centre from '../models/Master_data/Centre.js';
import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';
import Student from '../models/Students.js';

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        const class11 = await Class.findOne({ name: "11" });
        console.log("Class XI/11 ID:", class11 ? class11._id : "NOT FOUND");

        const targetSession = "2026-2028";
        const targetCentres = ['PHSPS_MIDNAPORE', 'PHSPS_BERHAMPUR', 'PHSPS_JODHPUR PARK', 'PHSPS_TAMLUK'];

        // 1. Let's find unique center values in Admission for session 2026-2028 and Class 11
        const uniqueNormalCentres = await Admission.distinct("centre", {
            academicSession: targetSession,
            class: class11?._id
        });
        console.log("\n=== Unique Centre names in Admission (2026-2028, Class 11) ===");
        console.log(uniqueNormalCentres);

        // 2. Let's check unique center values in BoardCourseAdmission for session 2026-2028 and Class 11
        // Wait, does BoardCourseAdmission have academicSession and class? Let's check fields.
        // It has studentId, boardId (ref to Boards which has class? Or is class on student?).
        // Let's inspect a few BoardCourseAdmission documents
        const boardAdmCount = await BoardCourseAdmission.countDocuments({});
        console.log(`\nTotal BoardCourseAdmission documents in DB: ${boardAdmCount}`);
        
        const sampleBoard = await BoardCourseAdmission.findOne({}).populate('studentId');
        if (sampleBoard) {
            console.log("\n=== Sample BoardCourseAdmission document ===");
            console.log(JSON.stringify(sampleBoard, null, 2));
        }

        // Let's count matching normal admissions with exactly the 4 centres, session 2026-2028, class 11
        const countNormalExact = await Admission.countDocuments({
            academicSession: targetSession,
            class: class11?._id,
            centre: { $in: targetCentres }
        });
        console.log(`\nNormal Admissions matching exactly targetCentres: ${countNormalExact}`);

        // What about case-insensitive matching or substring matching on centre?
        // Let's find all admissions (normal) matching class 11, session 2026-2028 and show their centres and counts
        const normalAdmissionsGroupedByCentre = await Admission.aggregate([
            {
                $match: {
                    academicSession: targetSession,
                    class: class11?._id
                }
            },
            {
                $group: {
                    _id: "$centre",
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log("\n=== Normal Admissions by Centre (2026-2028, Class 11) ===");
        console.log(normalAdmissionsGroupedByCentre);

        // Let's check if the 151 refers to both Normal and Board admissions?
        // Or is Class 11 on the student record, and we should check student status?
        // Let's find students details class 11
        console.log("\n=== Checking Student records matching centres ===");
        // The Student model has:
        // studentSchema: examSchema has class, sessionExamCourse has session, studentDetails has centre.
        // Let's query student collection directly for centres and class
        const studentsMatch = await Student.find({
            "studentsDetails.centre": { $in: targetCentres }
        });
        console.log(`Total students with matching details centre: ${studentsMatch.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
