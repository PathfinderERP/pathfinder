import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const centres = await db.collection('centres').find({
            centreName: { $regex: /head|ho|main|kolkata|hq/i }
        }).toArray();
        console.log("Matching Centres:");
        centres.forEach(c => console.log(`  - ${c.centreName} (ID: ${c._id})`));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
