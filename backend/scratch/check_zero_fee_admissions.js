import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Admission from '../models/Admission/Admission.js';

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        const zeroFeeAdmissions = await Admission.find({ totalFees: 0 }).limit(5);
        console.log(`Found ${zeroFeeAdmissions.length} zero-fee admissions.`);
        if (zeroFeeAdmissions.length > 0) {
            console.log(JSON.stringify(zeroFeeAdmissions, null, 2));
        } else {
            // Find admissions with very small fees
            const smallFeeAdmissions = await Admission.find({ totalFees: { $lte: 100 } }).limit(5);
            console.log(`Found ${smallFeeAdmissions.length} small-fee admissions (< 100).`);
            if (smallFeeAdmissions.length > 0) {
                console.log(JSON.stringify(smallFeeAdmissions, null, 2));
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
