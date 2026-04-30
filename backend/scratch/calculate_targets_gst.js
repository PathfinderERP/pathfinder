import mongoose from "mongoose";
import dotenv from "dotenv";
import CentreTarget from "../models/Sales/CentreTarget.js";
import Centre from "../models/Master_data/Centre.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const updateTargetsWithGST = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const targets = await CentreTarget.find({}).populate("centre", "centreName");

        console.log("--------------------------------------------------");
        console.log("CENTRE TARGETS CALCULATION WITH 18% GST");
        console.log("--------------------------------------------------");

        const report = targets.map(t => ({
            centre: t.centre?.centreName || "Unknown",
            month: t.month,
            year: t.year,
            originalTarget: t.targetAmount,
            targetWithGST: (t.targetAmount * 1.18).toFixed(2),
            achievedWithGST: t.achievedAmountWithGST || t.achievedAmount,
            achievementPercentage: t.targetAmount > 0 ? (((t.achievedAmountWithGST || t.achievedAmount) / (t.targetAmount * 1.18)) * 100).toFixed(1) + "%" : "0%"
        }));

        console.table(report);

        console.log("\nSummary: Calculation completed for " + targets.length + " records.");
        console.log("Note: This script only calculates and displays the data. It does NOT modify the database.");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

updateTargetsWithGST();
