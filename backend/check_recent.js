
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './models/Payment/Payment.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function checkRecentPayments() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        console.log(`Searching for payments created after ${oneHourAgo.toISOString()}...`);

        const payments = await Payment.find({
            createdAt: { $gt: oneHourAgo }
        }).sort({ createdAt: -1 }).lean();

        console.log(`Found ${payments.length} recent payments.`);

        for (const p of payments) {
            console.log(`Payment ID: ${p._id}, Bill ID: ${p.billId}, Admission: ${p.admission}, Amount: ${p.paidAmount}, Course: ${p.boardCourseName}, CreatedAt: ${p.createdAt}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkRecentPayments();
