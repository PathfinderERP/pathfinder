import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Admission from '../models/Admission/Admission.js';
import Payment from '../models/Payment/Payment.js';
import { generateBillId } from '../utils/billIdGenerator.js';

async function create805Bill() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const admission = await Admission.findOne({ admissionNumber: "PATH25000956" });
        if (!admission) {
            console.error("Admission PATH25000956 not found!");
            return;
        }

        const dateJul31 = new Date("2026-07-31T00:00:00.000Z");
        const newBillId = await generateBillId("BE", dateJul31);
        console.log("Generated Sequential Bill ID for 805rs bill:", newBillId);

        const totalAmount = 805;
        const baseAmount = totalAmount / 1.18;
        const courseFee = parseFloat(baseAmount.toFixed(2));
        const remainingTax = totalAmount - courseFee;
        const cgst = parseFloat((remainingTax / 2).toFixed(2));
        const sgst = parseFloat((remainingTax - cgst).toFixed(2));

        const newPayment = new Payment({
            admission: admission._id,
            installmentNumber: 0,
            amount: totalAmount,
            paidAmount: totalAmount,
            dueDate: dateJul31,
            paidDate: dateJul31,
            receivedDate: dateJul31,
            chequeDate: dateJul31,
            status: "PAID",
            paymentMethod: "BANK_TRANSFER",
            transactionId: "167400",
            remarks: "Bill generated for 805 INR",
            billId: newBillId,
            cgst: cgst,
            sgst: sgst,
            courseFee: courseFee,
            totalAmount: totalAmount,
            centre: "BEHALA"
        });

        await newPayment.save();
        console.log("✅ Created 805 INR Payment Record:", newPayment._id);

        const updatedPayments = await Payment.find({ admission: admission._id }).lean();
        console.log("\n--- ALL PAYMENTS FOR ANYESHA CHAKRABORTY ---");
        updatedPayments.forEach((p, idx) => {
            const dateStr = p.receivedDate ? new Date(p.receivedDate).toISOString().slice(0,10) : (p.paidDate ? new Date(p.paidDate).toISOString().slice(0,10) : 'N/A');
            console.log(`[${idx+1}] ID: ${p._id} | billId: ${p.billId} | paidAmount: ₹${p.paidAmount} | method: ${p.paymentMethod} | txnId: ${p.transactionId} | date: ${dateStr} | centre: ${p.centre}`);
        });

    } catch (err) {
        console.error("Error creating 805 bill:", err);
    } finally {
        await mongoose.disconnect();
    }
}

create805Bill();
