import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Class from '../models/Master_data/Class.js';
import Admission from '../models/Admission/Admission.js';
import Payment from '../models/Payment/Payment.js';
import Student from '../models/Students.js'; // Ensure Student model is registered

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        const class11 = await Class.findOne({ name: "11" });
        if (!class11) {
            console.error("Class '11' not found");
            return;
        }

        const targetCentres = [
            'PHSPS_MIDNAPORE',
            'PHSPS  BERHAMPUR',
            'PHSPS_JODHPUR_PARK',
            'PHSPS_TAMLUK'
        ];
        const targetSession = "2026-2028";

        const query = {
            academicSession: targetSession,
            class: class11._id,
            centre: { $in: targetCentres }
        };

        const admissions = await Admission.find(query).populate('student');
        console.log(`\nFound matching admissions: ${admissions.length}`);

        let totalDiscount = 0;
        let totalCommitted = 0;
        let totalPaid = 0;
        let totalRemaining = 0;

        const admissionIds = [];

        admissions.forEach(a => {
            totalDiscount += (a.discountAmount || 0);
            totalCommitted += (a.totalFees || 0);
            totalPaid += (a.totalPaidAmount || 0);
            totalRemaining += (a.remainingAmount || 0);
            admissionIds.push(a._id);
        });

        console.log("\n=== Financial Totals before update ===");
        console.log(`- Committed Amount (totalFees):  ₹${totalCommitted.toFixed(2)}`);
        console.log(`- Paid Amount (totalPaidAmount): ₹${totalPaid.toFixed(2)}`);
        console.log(`- Pending Amount (remaining):    ₹${totalRemaining.toFixed(2)}`);
        console.log(`- Discount Amount:               ₹${totalDiscount.toFixed(2)}`);

        // Check if there are associated payments
        const payments = await Payment.find({ admission: { $in: admissionIds } });
        console.log(`\nFound associated Payment records: ${payments.length}`);
        if (payments.length > 0) {
            let paymentsSum = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
            console.log(`- Total Sum in Payment records:  ₹${paymentsSum.toFixed(2)}`);
            // print unique payment statuses
            const paymentStatuses = [...new Set(payments.map(p => p.status))];
            console.log(`- Unique payment statuses: ${paymentStatuses.join(', ')}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
