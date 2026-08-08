import mongoose from "mongoose";
import dotenv from "dotenv";
import CentreSchema from "../models/Master_data/Centre.js";

dotenv.config({ path: "./backend/.env" });

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || "mongodb://localhost:27017/pathfinder";

async function inspect() {
    try {
        await mongoose.connect(MONGO_URI);
        const centres = await CentreSchema.find({}).lean();
        console.log("Total centres count:", centres.length);
        centres.forEach(c => {
            console.log(`ID: ${c._id} | Name: ${c.centreName} | Status: ${c.status}`);
        });
        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

inspect();
