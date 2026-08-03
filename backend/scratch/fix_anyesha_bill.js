import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';
import Payment from '../models/Payment/Payment.js';
import { generateBillId } from '../utils/billIdGenerator.js';

async function generateSequenceBill() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const admission = await Admission.findOne({ admissionNumber: "PATH25000956" });
        if (!admission) {
            console.error("Admission PATH25000956 not found!");
            return;
        }

        console.log(`Initial Admission State: totalFees=${admission.totalFees}, totalPaidAmount=${admission.totalPaidAmount}, remainingAmount=${admission.remainingAmount}`);

        // Generate next sequence bill ID for BEHALA
        const dateJul31 = new Date("2026-07-31T00:00:00.000Z");
        const newBillId1 = await generateBillId("BE", dateJul31);
        console.log("Generated Sequence Bill ID 1:", newBillId1);

        // Find the payment record with billId PATH/BE/2026-27/0000241 or Payment 3
        let payment3 = await Payment.findById("6a085493e89d90d9a67b53c3");
        if (payment3) {
            console.log(`Updating Payment ${payment3._id} (prev billId: ${payment3.billId}) -> new billId: ${newBillId1}`);
            payment3.billId = newBillId1;
            payment3.paidAmount = 2000;
            payment3.amount = 2000;
            payment3.paymentMethod = "BANK_TRANSFER";
            payment3.receivedDate = dateJul31;
            payment3.paidDate = dateJul31;
            payment3.chequeDate = dateJul31;
            payment3.status = "PAID";
            payment3.centre = "BEHALA";
            payment3.courseFee = 1694.92;
            payment3.cgst = 152.54;
            payment3.sgst = 152.54;
            payment3.totalAmount = 2000;
            await payment3.save();
        }

        // Check if there is another out-of-sequence bill PATH/BE/2026-27/0000397
        let payment4 = await Payment.findById("6a43ce9a97973b0250721321");
        if (payment4 && payment4.billId === "PATH/BE/2026-27/0000397") {
            const newBillId2 = await generateBillId("BE", dateJul31);
            console.log(`Generated Sequence Bill ID 2: ${newBillId2} for Payment ${payment4._id}`);
            payment4.billId = newBillId2;
            payment4.paidAmount = 2000;
            payment4.amount = 2000;
            payment4.paymentMethod = "BANK_TRANSFER";
            payment4.receivedDate = dateJul31;
            payment4.paidDate = dateJul31;
            payment4.chequeDate = dateJul31;
            payment4.status = "PAID";
            payment4.centre = "BEHALA";
            payment4.courseFee = 1694.92;
            payment4.cgst = 152.54;
            payment4.sgst = 152.54;
            payment4.totalAmount = 2000;
            await payment4.save();
        }

        // Ensure admission totals & remainingAmount stay unchanged
        admission.totalPaidAmount = 116393;
        admission.remainingAmount = admission.totalFees - admission.totalPaidAmount; // 13607
        await admission.save();

        console.log(`Final Admission State: totalFees=${admission.totalFees}, totalPaidAmount=${admission.totalPaidAmount}, remainingAmount=${admission.remainingAmount}`);

        // Fetch updated payments to verify
        const updatedPayments = await Payment.find({ admission: admission._id }).lean();
        console.log("\n--- UPDATED PAYMENTS FOR ANYESHA CHAKRABORTY ---");
        updatedPayments.forEach(p => {
            const dateStr = p.receivedDate ? new Date(p.receivedDate).toISOString().slice(0,10) : (p.paidDate ? new Date(p.paidDate).toISOString().slice(0,10) : 'N/A');
            console.log(`ID: ${p._id} | billId: ${p.billId} | paidAmount: ₹${p.paidAmount} | method: ${p.paymentMethod} | date: ${dateStr} | centre: ${p.centre}`);
        });

    } catch (err) {
        console.error("Error in generateSequenceBill:", err);
    } finally {
        await mongoose.disconnect();
    }
}

generateSequenceBill();
