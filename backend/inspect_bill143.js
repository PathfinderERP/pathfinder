import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './models/Payment/Payment.js';

dotenv.config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const payments = await Payment.find({
            billId: { $regex: /143/i }
        }).lean();

        console.log("Found payments matching 143:", JSON.stringify(payments, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
