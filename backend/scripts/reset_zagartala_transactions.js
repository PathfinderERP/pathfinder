import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';
import Payment from '../models/Payment/Payment.js';
import { clearCachePattern } from '../utils/redisCache.js';

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    const isExecute = process.argv.includes('--execute');
    console.log(`=======================================================`);
    console.log(`ZAGARTALA Centre Transaction Reset (Option A)`);
    console.log(`Mode: ${isExecute ? 'EXECUTE (Committing Changes)' : 'DRY RUN (Preview Only)'}`);
    console.log(`=======================================================\n`);

    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB successfully.\n');

        const centreRegex = /^(zagartala|agartala)$/i;

        // 1. Fetch Normal Admissions
        const normalAdmissions = await Admission.find({ centre: centreRegex });
        const normalIds = normalAdmissions.map(a => a._id);
        const normalPaidTotal = normalAdmissions.reduce((sum, a) => sum + (a.totalPaidAmount || 0), 0);

        // 2. Fetch Board Course Admissions
        const boardAdmissions = await BoardCourseAdmission.find({ centre: centreRegex });
        const boardIds = boardAdmissions.map(a => a._id);
        const boardPaidTotal = boardAdmissions.reduce((sum, a) => sum + (a.totalPaidAmount || 0), 0);

        const allAdmissionIds = [...normalIds, ...boardIds];

        // 3. Fetch Payments
        const payments = await Payment.find({
            $or: [
                { admission: { $in: allAdmissionIds } },
                { centre: centreRegex }
            ]
        });
        const paymentTotal = payments.reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

        console.log(`--- SCAN SUMMARY ---`);
        console.log(`Normal Admissions found:       ${normalAdmissions.length}`);
        console.log(`  - Total Paid Amount:         ₹${normalPaidTotal.toLocaleString()}`);
        console.log(`Board Course Admissions found: ${boardAdmissions.length}`);
        console.log(`  - Total Paid Amount:         ₹${boardPaidTotal.toLocaleString()}`);
        console.log(`Payment Records found:         ${payments.length}`);
        console.log(`  - Total Transactions Amount: ₹${paymentTotal.toLocaleString()}`);
        console.log(`--------------------\n`);

        if (!isExecute) {
            console.log(`[DRY RUN] No changes were made to the database.`);
            console.log(`To execute this reset, run with: node reset_zagartala_transactions.js --execute`);
            await mongoose.disconnect();
            process.exit(0);
        }

        // --- EXECUTE UPDATE ---
        console.log(`Proceeding with database updates...\n`);

        // 1. Update Normal Admissions
        let updatedNormalCount = 0;
        for (const adm of normalAdmissions) {
            adm.totalPaidAmount = 0;
            adm.remainingAmount = adm.totalFees || 0;
            adm.paymentStatus = 'PENDING';

            if (adm.downPayment > 0) {
                adm.downPaymentStatus = 'PENDING';
                adm.downPaymentTransactionId = null;
                adm.downPaymentReceivedDate = null;
                adm.downPaymentBankName = null;
                adm.downPaymentAccountHolderName = null;
                adm.downPaymentChequeDate = null;
                adm.downPaymentBankAccount = null;
            }

            if (adm.paymentBreakdown && adm.paymentBreakdown.length > 0) {
                adm.paymentBreakdown.forEach(inst => {
                    inst.paidAmount = 0;
                    inst.status = 'PENDING';
                    inst.paidDate = null;
                    inst.receivedDate = null;
                    inst.paymentMethod = null;
                    inst.transactionId = null;
                    inst.bankName = null;
                    inst.accountHolderName = null;
                    inst.chequeDate = null;
                    inst.bankAccount = null;
                    inst.remarks = null;
                });
            }

            await adm.save({ validateBeforeSave: false });
            updatedNormalCount++;
        }
        console.log(`✓ Updated ${updatedNormalCount} Normal Admissions (all paid amounts set to ₹0, installments reverted to PENDING).`);

        // 2. Update Board Admissions
        let updatedBoardCount = 0;
        for (const bca of boardAdmissions) {
            bca.totalPaidAmount = 0;
            bca.examFeePaid = 0;
            if (bca.examFee > 0) bca.examFeeStatus = 'PENDING';
            bca.additionalThingsPaid = 0;
            if (bca.additionalThingsAmount > 0) bca.additionalThingsStatus = 'PENDING';

            if (bca.installments && bca.installments.length > 0) {
                bca.installments.forEach(inst => {
                    inst.paidAmount = 0;
                    inst.adjustmentAmount = 0;
                    inst.status = 'PENDING';
                    inst.paymentTransactions = [];
                });
            }

            if (bca.monthlySubjectHistory && bca.monthlySubjectHistory.length > 0) {
                bca.monthlySubjectHistory.forEach(h => {
                    h.isPaid = false;
                    h.status = 'PENDING';
                });
            }

            await bca.save({ validateBeforeSave: false });
            updatedBoardCount++;
        }
        console.log(`✓ Updated ${updatedBoardCount} Board Course Admissions (all paid amounts set to ₹0, installments reverted to PENDING).`);

        // 3. Delete Associated Payments
        const deletePaymentResult = await Payment.deleteMany({
            $or: [
                { admission: { $in: allAdmissionIds } },
                { centre: centreRegex }
            ]
        });
        console.log(`✓ Deleted ${deletePaymentResult.deletedCount} Payment records associated with ZAGARTALA centre.`);

        // 4. Clear Redis Cache
        try {
            await clearCachePattern('admissions*');
            await clearCachePattern('payments*');
            await clearCachePattern('finance*');
            console.log(`✓ Cleared Redis cache patterns.`);
        } catch (cacheErr) {
            console.warn(`! Redis cache clearing warning: ${cacheErr.message}`);
        }

        console.log(`\n=======================================================`);
        console.log(`Successfully completed transaction reset for ZAGARTALA!`);
        console.log(`=======================================================`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error during transaction reset:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

run();
