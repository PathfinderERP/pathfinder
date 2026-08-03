import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Payment from '../models/Payment/Payment.js';

async function check511() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const p511 = await Payment.findOne({ billId: "PATH/BE/2026-27/0000511" }).lean();
        console.log("Payment with PATH/BE/2026-27/0000511:", p511);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check511();
