import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admission from './models/Admission/Admission.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Centre from './models/Master_data/Centre.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        // Date range matching Today
        const startDate = "2026-06-16";
        const endDate = "2026-06-16";
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Construct base match stage
        let matchStage = {
            admissionDate: { $gte: start, $lte: end }
        };

        // Let's resolve allowed centres (simulate superAdmin role where all active centres are allowed)
        let activeCentres = await Centre.find({ status: { $ne: "deactive" } }).select("centreName");
        let activeCentreNames = activeCentres.map(c => c.centreName);
        matchStage.centre = { $in: activeCentreNames };

        let boardAdmissionQuery = { ...matchStage };

        console.log("Diag matchStage:", matchStage);
        console.log("Diag boardAdmissionQuery:", boardAdmissionQuery);

        // Run averageAdmissionFee pipeline count
        const avgFeeNormalCount = await Admission.countDocuments(matchStage);
        const avgFeeBoardCount = await BoardCourseAdmission.countDocuments(boardAdmissionQuery);
        console.log(`\n--- averageAdmissionFee Stats ---`);
        console.log(`Normal count: ${avgFeeNormalCount}`);
        console.log(`Board count: ${avgFeeBoardCount}`);
        console.log(`Total: ${avgFeeNormalCount + avgFeeBoardCount}`);

        // Run admissionReport monthly trend query
        const monthlyAdmitted = await Admission.aggregate([
            { $match: matchStage },
            { $unionWith: { coll: "boardcourseadmissions", pipeline: [{ $match: boardAdmissionQuery }] } },
            {
                $group: {
                    _id: { $month: "$admissionDate" },
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log(`\n--- admissionReport monthlyAdmitted aggregation result ---`);
        console.log(monthlyAdmitted);

        // Let's inspect the actual dates in boardcourseadmissions
        const boardDocs = await BoardCourseAdmission.find(boardAdmissionQuery).select("admissionDate centre boardCourseName studentName");
        console.log(`\n--- Board Course Admissions Matched docs (${boardDocs.length}) ---`);
        boardDocs.forEach(d => {
            console.log(`ID: ${d._id}, Student: ${d.studentName}, Date: ${d.admissionDate.toISOString()}, Centre: ${d.centre}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
