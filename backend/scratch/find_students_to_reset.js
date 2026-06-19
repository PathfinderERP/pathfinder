import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Load schemas/models
import Class from '../models/Master_data/Class.js';
import Session from '../models/Master_data/Session.js';
import Centre from '../models/Master_data/Centre.js';
import Admission from '../models/Admission/Admission.js';
import Student from '../models/Students.js';

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        // 1. Get Class XI / 11 info
        const classes = await Class.find({});
        console.log("=== Classes in DB ===");
        classes.forEach(c => console.log(`ID: ${c._id}, Name: "${c.name}"`));

        // Find Class ID for "11" or "Class 11" or similar
        const class11 = classes.find(c => c.name === "11" || c.name === "XI" || c.name.includes("11"));
        console.log("Class 11 match:", class11);

        // 2. Get active sessions
        const sessions = await Session.find({});
        console.log("\n=== Sessions in DB ===");
        sessions.forEach(s => console.log(`ID: ${s._id}, Name: "${s.sessionName}"`));

        // 3. Get Centres info matching the 4 centers
        const targetCentres = ['PHSPS_MIDNAPORE', 'PHSPS_BERHAMPUR', 'PHSPS_JODHPUR PARK', 'PHSPS_TAMLUK'];
        const centres = await Centre.find({});
        console.log("\n=== Centres in DB ===");
        const matchingCentres = [];
        centres.forEach(c => {
            const isMatch = targetCentres.some(tc => c.centreName?.toUpperCase().includes(tc.toUpperCase()) || c.centreName === tc);
            if (isMatch) {
                console.log(`ID: ${c._id}, Name: "${c.centreName}" (MATCH)`);
                matchingCentres.push(c);
            } else {
                // optional logging
            }
        });

        console.log("\n=== Sample Admission Document ===");
        const sampleAdmission = await Admission.findOne({});
        if (sampleAdmission) {
            console.log(JSON.stringify(sampleAdmission, null, 2));
        } else {
            console.log("No admissions found!");
        }

        // Let's count admissions by center (since center can be stored as center ID or centerName string)
        console.log("\n=== Querying Admissions ===");
        
        // We will build search criteria for the 4 centers.
        // Let's check both ID and Name format for centers.
        const centerQueries = [];
        targetCentres.forEach(tc => {
            centerQueries.push(tc); // as String
            const matchInDb = centres.find(c => c.centreName === tc);
            if (matchInDb) {
                centerQueries.push(matchInDb._id.toString());
            }
        });
        console.log("Center query values:", centerQueries);

        const sessionQuery = "2026-2028";
        const classQueryId = class11 ? class11._id : null;

        const baseQuery = {
            academicSession: sessionQuery,
            centre: { $in: centerQueries }
        };
        if (classQueryId) {
            baseQuery.class = classQueryId;
        }

        console.log("Executing count matching:", baseQuery);
        const matchingAdmissions = await Admission.find(baseQuery).populate('student');
        console.log(`Total matching admissions found: ${matchingAdmissions.length}`);

        if (matchingAdmissions.length > 0) {
            console.log("\n=== Sample matching admission fields before reset ===");
            const sample = matchingAdmissions[0];
            console.log({
                admissionNumber: sample.admissionNumber,
                studentName: sample.studentName || (sample.student?.studentsDetails && sample.student?.studentsDetails[0]?.studentName),
                centre: sample.centre,
                academicSession: sample.academicSession,
                class: sample.class,
                discountAmount: sample.discountAmount,
                totalFees: sample.totalFees,
                remainingAmount: sample.remainingAmount,
                totalPaidAmount: sample.totalPaidAmount,
                downPayment: sample.downPayment,
                paymentStatus: sample.paymentStatus,
                numberOfInstallments: sample.numberOfInstallments,
                installmentAmount: sample.installmentAmount
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
