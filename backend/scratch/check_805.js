import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Admission from '../models/Admission/Admission.js';
import Payment from '../models/Payment/Payment.js';

async function check805() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const admission = await Admission.findOne({ admissionNumber: "PATH25000956" }).lean();
        console.log("--- ADMISSION DATA ---");
        console.log(`totalFees: ${admission.totalFees}, totalPaidAmount: ${admission.totalPaidAmount}, remainingAmount: ${admission.remainingAmount}`);
        console.log("paymentBreakdown:", JSON.stringify(admission.paymentBreakdown, null, 2));

        const payments = await Payment.find({ admission: admission._id }).lean();
        console.log("\n--- EXISTING PAYMENTS ---");
        payments.forEach((p, idx) => {
            console.log(`[${idx+1}] ID: ${p._id} | billId: ${p.billId} | paidAmount: ${p.paidAmount} | method: ${p.paymentMethod} | txnId: ${p.transactionId} | date: ${p.receivedDate} | status: ${p.status}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check805();
