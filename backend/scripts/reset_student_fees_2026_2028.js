import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Class from '../models/Master_data/Class.js';
import Admission from '../models/Admission/Admission.js';
import Payment from '../models/Payment/Payment.js';
import Student from '../models/Students.js';
import { clearCachePattern } from '../utils/redisCache.js';

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        const class11 = await Class.findOne({ name: "11" });
        if (!class11) {
            console.error("Class '11' not found in database.");
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

        const admissions = await Admission.find(query);
        console.log(`Matching Admissions count: ${admissions.length}`);

        if (admissions.length !== 151) {
            console.error(`ERROR: Expected 151 admissions but found ${admissions.length}. Aborting update for safety.`);
            return;
        }

        const admissionIds = admissions.map(a => a._id);

        // 1. Delete associated Payments
        const deletePaymentResult = await Payment.deleteMany({ admission: { $in: admissionIds } });
        console.log(`Deleted associated Payment records count: ${deletePaymentResult.deletedCount}`);

        // 2. Update Admission records
        const updateResult = await Admission.updateMany(
            query,
            {
                $set: {
                    discountAmount: 0,
                    baseFees: 0,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    totalFees: 0,
                    downPayment: 0,
                    remainingAmount: 0,
                    numberOfInstallments: 0,
                    installmentAmount: 0,
                    paymentBreakdown: [],
                    paymentStatus: "COMPLETED",
                    totalPaidAmount: 0
                }
            }
        );
        console.log(`Successfully updated ${updateResult.modifiedCount} Admission records.`);

        // 3. Clear Redis Caches
        try {
            await clearCachePattern("admissions:list:*");
            await clearCachePattern("finance:transaction_report:*");
            await clearCachePattern("finance:daily_collection:*");
            console.log("Redis caches cleared successfully.");
        } catch (cacheErr) {
            console.warn("Warning: Could not clear Redis caches, error:", cacheErr.message);
        }

        console.log("\n=== POST-UPDATE VERIFICATION ===");
        const updatedAdmissions = await Admission.find(query);
        let totalDiscount = 0;
        let totalCommitted = 0;
        let totalPaid = 0;
        let totalRemaining = 0;

        updatedAdmissions.forEach(a => {
            totalDiscount += (a.discountAmount || 0);
            totalCommitted += (a.totalFees || 0);
            totalPaid += (a.totalPaidAmount || 0);
            totalRemaining += (a.remainingAmount || 0);
        });

        console.log(`- Count of admissions post-update: ${updatedAdmissions.length}`);
        console.log(`- Committed Amount Sum:            ₹${totalCommitted.toFixed(2)}`);
        console.log(`- Paid Amount Sum:                 ₹${totalPaid.toFixed(2)}`);
        console.log(`- Pending Amount Sum:              ₹${totalRemaining.toFixed(2)}`);
        console.log(`- Discount Amount Sum:             ₹${totalDiscount.toFixed(2)}`);

        const remainingPayments = await Payment.find({ admission: { $in: admissionIds } });
        console.log(`- Count of remaining Payment records: ${remainingPayments.length}`);

        console.log("\nMigration completed successfully.");

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
