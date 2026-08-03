import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Payment from '../models/Payment/Payment.js';
import Admission from '../models/Admission/Admission.js';

async function detailPayments() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const adm = await Admission.findOne({ admissionNumber: "PATH25000956" }).lean();
        console.log("--- ADMISSION DATA ---");
        console.log(`totalFees: ${adm.totalFees}, totalPaidAmount: ${adm.totalPaidAmount}, remainingAmount: ${adm.remainingAmount}`);
        console.log("paymentBreakdown:", JSON.stringify(adm.paymentBreakdown, null, 2));

        const payments = await Payment.find({ admission: adm._id }).lean();
        console.log("\n--- PAYMENTS ---");
        payments.forEach((p, idx) => {
            console.log(`\n[Payment ${idx+1}] ID: ${p._id}`);
            console.log(`  billId: ${p.billId}`);
            console.log(`  installmentNumber: ${p.installmentNumber}`);
            console.log(`  amount: ${p.amount} | paidAmount: ${p.paidAmount}`);
            console.log(`  paymentMethod: ${p.paymentMethod} | transactionId: ${p.transactionId}`);
            console.log(`  paidDate: ${p.paidDate} | receivedDate: ${p.receivedDate} | chequeDate: ${p.chequeDate}`);
            console.log(`  status: ${p.status} | remarks: "${p.remarks}"`);
            console.log(`  centre: ${p.centre}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

detailPayments();
