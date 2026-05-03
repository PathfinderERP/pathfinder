import "dotenv/config";
import mongoose from "mongoose";
import Batch from "./models/Master_data/Batch.js";
import connectDB from "./db/connect.js";

async function checkBatchesDetailed() {
    try {
        await connectDB();
        console.log("Connected to DB");

        const total = await Batch.countDocuments();
        console.log("Total Batches:", total);

        const withCentre = await Batch.countDocuments({ centreId: { $exists: true } });
        console.log("Batches with centreId:", withCentre);

        const withCenter = await Batch.countDocuments({ centerId: { $exists: true } });
        console.log("Batches with centerId (alternative name):", withCenter);

        const sample = await Batch.findOne({ centreId: { $exists: true } });
        if (sample) {
            console.log("Sample with centreId:", JSON.stringify(sample, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error("Error checking batches:", error);
        process.exit(1);
    }
}

checkBatchesDetailed();
