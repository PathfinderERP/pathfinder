import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Centre from '../models/Master_data/Centre.js';
import Payment from '../models/Payment/Payment.js';
import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const centres = await Centre.find({}).lean();
        console.log("--- CENTRES IN DB ---");
        centres.forEach(c => {
            console.log(`Name: "${c.centreName}" | enterCode: "${c.enterCode}" | centreCode: "${c.centreCode}"`);
        });

        console.log("\n--- SEARCHING FOR BILL PATH/CT/2026-27/0000215 ---");
        const payment = await Payment.findOne({ billId: "PATH/CT/2026-27/0000215" }).lean();
        if (payment) {
            console.log("Payment found:", JSON.stringify(payment, null, 2));
            const adm = await Admission.findById(payment.admission).lean() || await BoardCourseAdmission.findById(payment.admission).lean();
            console.log("Associated Admission:", JSON.stringify(adm, null, 2));
        } else {
            console.log("Payment PATH/CT/2026-27/0000215 not found with exact match, searching regex...");
            const payments = await Payment.find({ billId: { $regex: "0000215", $options: "i" } }).lean();
            console.log("Found payments matching 0000215:", payments);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
