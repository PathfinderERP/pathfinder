import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Payment from '../models/Payment/Payment.js';

async function checkJul31Bills() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const jul31Start = new Date("2026-07-31T00:00:00.000Z");
        const jul31End = new Date("2026-07-31T23:59:59.999Z");

        const bills = await Payment.find({
            centre: "BEHALA",
            $or: [
                { receivedDate: { $gte: jul31Start, $lte: jul31End } },
                { paidDate: { $gte: jul31Start, $lte: jul31End } },
                { createdAt: { $gte: jul31Start, $lte: jul31End } }
            ]
        }).sort({ billId: 1 }).lean();

        console.log(`Found ${bills.length} bills for BEHALA on 2026-07-31:`);
        bills.forEach(b => {
            console.log(`billId: ${b.billId} | amount: ${b.paidAmount} | method: ${b.paymentMethod} | admId: ${b.admission} | createdAt: ${b.createdAt} | txnId: ${b.transactionId}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkJul31Bills();
