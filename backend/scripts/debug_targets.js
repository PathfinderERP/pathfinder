import mongoose from "mongoose";
import dotenv from "dotenv";
import CentreTarget from "../models/Sales/CentreTarget.js";

dotenv.config();

const debugTargets = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const targets = await CentreTarget.find({});
        console.log(`Found ${targets.length} targets.`);

        if (targets.length > 0) {
            console.log("Sample Target:", JSON.stringify(targets[0], null, 2));
            console.log("All Financial Years:", targets.map(t => t.financialYear));
            console.log("All Years:", targets.map(t => t.year));
            console.log("All Months:", targets.map(t => t.month));
        }

        process.exit(0);
    } catch (err) {
        console.error("Debug Failed:", err);
        process.exit(1);
    }
};

debugTargets();
