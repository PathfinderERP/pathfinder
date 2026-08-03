import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Payment from '../models/Payment/Payment.js';
import BillCounter from '../models/Payment/BillCounter.js';
import { generateBillId } from '../utils/billIdGenerator.js';

async function checkBehalaBills() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const counter = await BillCounter.findOne({ prefix: "PATH/BE/2026-27/" }).lean();
        console.log("BillCounter for PATH/BE/2026-27/:", counter);

        const latestBills = await Payment.find({ billId: { $regex: "^PATH/BE/2026-27/" } })
            .sort({ billId: -1 })
            .limit(10)
            .lean();

        console.log("--- LATEST BEHALA BILLS IN DB ---");
        latestBills.forEach(b => console.log(`billId: ${b.billId} | createdAt: ${b.createdAt} | receivedDate: ${b.receivedDate} | amount: ${b.paidAmount}`));

        const nextBillId = await generateBillId("BE", "2026-07-31");
        console.log("Next Generated Bill ID using generateBillId('BE', '2026-07-31'):", nextBillId);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkBehalaBills();
