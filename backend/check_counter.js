
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BillCounter from './models/Payment/BillCounter.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function checkCounter() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const counters = await BillCounter.find({}).lean();
        console.log("All Counters:", JSON.stringify(counters, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkCounter();
