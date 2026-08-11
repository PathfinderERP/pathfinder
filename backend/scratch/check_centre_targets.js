import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import CentreTarget from '../models/Sales/CentreTarget.js';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");
        const targets = await CentreTarget.find({}).select("financialYear year month centre targetAmount").limit(20).lean();
        console.log("Found targets count:", targets.length);
        console.log("Sample targets:", targets.slice(0, 5));

        const distinctFy = await CentreTarget.distinct("financialYear");
        const distinctYears = await CentreTarget.distinct("year");
        const distinctMonths = await CentreTarget.distinct("month");
        console.log("Distinct financialYears:", distinctFy);
        console.log("Distinct years:", distinctYears);
        console.log("Distinct months:", distinctMonths);

        // Check specifically for August
        const augTargets = await CentreTarget.find({ month: "August" }).select("financialYear year month targetAmount").limit(10).lean();
        console.log("August targets count:", augTargets.length);
        console.log("August targets sample:", augTargets);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
