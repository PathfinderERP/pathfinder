import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Payment from '../models/Payment/Payment.js';
import Admission from '../models/Admission/Admission.js';
import CentreSchema from '../models/Master_data/Centre.js';
import { generateBillId } from '../utils/billIdGenerator.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGO_URL = process.env.MONGO_URL;

async function fixBills() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to MongoDB");

        // 1. Find all payments with MIG- billId
        const legacyPayments = await Payment.find({
            billId: { $regex: /^MIG-/ }
        }).populate({
            path: 'admission',
            select: 'centre admissionNumber admissionDate'
        }).sort({ paidDate: 1 }); // Sort by date to maintain sequence

        console.log(`📊 Found ${legacyPayments.length} legacy (MIG-) bill records.`);

        if (legacyPayments.length === 0) {
            console.log("✨ No legacy records found to fix.");
            return;
        }

        const centres = await CentreSchema.find({});

        let fixedCount = 0;
        let skipCount = 0;

        for (const payment of legacyPayments) {
            try {
                if (!payment.admission) {
                    console.warn(`⚠️ Payment ${payment._id} has no associated admission. Skipping.`);
                    skipCount++;
                    continue;
                }

                const centreName = payment.admission.centre;
                let centreObj = centres.find(c => c.centreName === centreName);
                if (!centreObj) {
                    centreObj = centres.find(c => c.centreName && c.centreName.toLowerCase() === centreName.trim().toLowerCase());
                }

                const centreCode = centreObj ? centreObj.enterCode : 'GEN';
                
                // Generate proper sequential ID
                const oldId = payment.billId;
                const newId = await generateBillId(centreCode);

                payment.billId = newId;
                await payment.save();

                console.log(`✅ Fixed: ${oldId} ➡️ ${newId} (Centre: ${centreCode})`);
                fixedCount++;

            } catch (err) {
                console.error(`❌ Error fixing payment ${payment._id}:`, err.message);
            }
        }

        console.log(`\n🎉 Cleanup Summary:`);
        console.log(`✅ Properly Fixed: ${fixedCount}`);
        console.log(`⏭️  Skipped: ${skipCount}`);

    } catch (error) {
        console.error("💥 Critical Cleanup Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
}

fixBills();
