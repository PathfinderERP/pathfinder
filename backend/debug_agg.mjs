import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function test() {
    try {
        console.log("Connecting to:", MONGO_URL);
        await mongoose.connect(MONGO_URL);
        console.log("Connected.");

        // Define a simple schema just for testing
        const Payment = mongoose.model('TestPayment', new mongoose.Schema({}), 'payments');

        console.log("Running aggregation with allowDiskUse(true)...");
        const results = await Payment.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
        ]).allowDiskUse(true);

        console.log("Aggregation successful. Result count:", results.length);

        const agg = Payment.aggregate([ { $sort: { createdAt: -1 } } ]).allowDiskUse(true);
        console.log("Aggregation Options:", agg.options);

        process.exit(0);
    } catch (err) {
        console.error("Aggregation failed:", err);
        process.exit(1);
    }
}

test();
