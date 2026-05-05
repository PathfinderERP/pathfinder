import "dotenv/config";
import mongoose from "mongoose";
import Batch from "./models/Master_data/Batch.js";
import connectDB from "./db/connect.js";

async function checkBatches() {
    try {
        await connectDB();
        console.log("Connected to DB");

        const batches = await Batch.find().limit(5);
        console.log("Sample Batches:", JSON.stringify(batches, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("Error checking batches:", error);
        process.exit(1);
    }
}

checkBatches();
