import mongoose from "mongoose";
import BoardCourseAdmission from "./models/Admission/BoardCourseAdmission.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function runTest() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        // Grab one admission to inspect it
        const admission = await BoardCourseAdmission.findOne().sort({ createdAt: -1 });
        if (!admission) {
            console.log("No admissions found.");
            process.exit(0);
        }

        console.log("--- Latest Admission ---");
        console.log("Student Name:", admission.studentName);
        console.log("Board Course Name:", admission.boardCourseName);
        console.log("Additional Things Name:", admission.additionalThingsName);
        console.log("Additional Things Amount:", admission.additionalThingsAmount);
        console.log("Additional Things Paid:", admission.additionalThingsPaid);
        console.log("Installment Count:", admission.installments.length);

        if (admission.installments.length > 0) {
            const lastInst = admission.installments[admission.installments.length - 1];
            console.log(`Last Installment (Month ${lastInst.monthNumber}):`);
            console.log(`  Standard Amount: ${lastInst.standardAmount}`);
            console.log(`  Payable Amount: ${lastInst.payableAmount}`);
            console.log(`  Paid Amount: ${lastInst.paidAmount}`);
            console.log(`  Status: ${lastInst.status}`);
        }
        
    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        mongoose.connection.close();
    }
}

runTest();
