import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Centre from "../models/Master_data/Centre.js";
import DailyTarget from "../models/Sales/DailyTarget.js";
import { getDailyCollectionReportData } from "../services/dailyCollectionService.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // 1. Get a SuperAdmin user
        const superAdmin = await User.findOne({ role: /superadmin/i });
        if (!superAdmin) {
            console.log("SuperAdmin user not found");
            return;
        }
        console.log("Found SuperAdmin:", superAdmin.name, "ID:", superAdmin._id);

        // 2. Get a Centre
        const centre = await Centre.findOne({});
        if (!centre) {
            console.log("Centre not found");
            return;
        }
        console.log("Found Centre:", centre.centreName, "ID:", centre._id);

        // 3. Upsert a custom DailyTarget for today
        const dateStr = "2026-06-30";
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        const targetVal = 12500;
        await DailyTarget.findOneAndUpdate(
            { centre: centre._id, date: targetDate },
            { targetAmount: targetVal, createdBy: superAdmin._id },
            { upsert: true, new: true }
        );
        console.log(`Saved custom daily target of ${targetVal} for ${centre.centreName} on ${targetDate.toISOString()}`);

        // 4. Retrieve via dailyCollectionService
        const report = await getDailyCollectionReportData({
            query: { date: dateStr },
            user: { id: superAdmin._id.toString(), role: "superAdmin" }
        });

        console.log("Retrieved centreTargets in daily collection report:");
        console.log(report.centreTargets);

        // Verify that the custom target matches
        const retrievedVal = report.centreTargets[centre.centreName];
        console.log(`Expected: ${targetVal}, Got: ${retrievedVal}`);
        if (retrievedVal === targetVal) {
            console.log("SUCCESS: Daily target saved and retrieved successfully!");
        } else {
            console.log("FAILURE: Retrieved target value does not match custom target.");
        }

        // Clean up the created daily target
        await DailyTarget.deleteOne({ centre: centre._id, date: targetDate });
        console.log("Cleaned up custom daily target.");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
