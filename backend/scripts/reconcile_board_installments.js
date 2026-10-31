import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function reconcileBoardInstallments() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const BoardCourseAdmission = mongoose.model('BoardCourseAdmission', new mongoose.Schema({}, { strict: false }));
        const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));

        const admissions = await BoardCourseAdmission.find({
            "installments.0": { $exists: true }
        });

        console.log(`Found ${admissions.length} admissions with installments.`);
        let updatedCount = 0;

        for (const adm of admissions) {
            const allPayments = await Payment.find({ admission: adm._id });
            const rejectedTxIds = new Set(allPayments.filter(p => p.status === 'REJECTED' || p.status === 'CANCELLED').map(p => p.transactionId).filter(Boolean));

            let modified = false;

            adm.installments.forEach(inst => {
                if (rejectedTxIds.size > 0) {
                    const initialCount = (inst.paymentTransactions || []).length;
                    inst.paymentTransactions = (inst.paymentTransactions || []).filter(t => !rejectedTxIds.has(t.transactionId));
                    if (inst.paymentTransactions.length !== initialCount) modified = true;
                }

                const txSum = (inst.paymentTransactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                const matchingPayment = allPayments.find(p =>
                    p.installmentNumber === (inst.monthNumber - 1) &&
                    (p.status === 'PAID' || p.status === 'COMPLETED') &&
                    Number(p.paidAmount || p.totalAmount || 0) > 0 &&
                    !((p.remarks || '').toLowerCase().includes('exam') || (p.boardCourseName || '').toLowerCase().includes('examination'))
                );

                const correctPaid = txSum > 0
                    ? txSum
                    : (matchingPayment ? Number(matchingPayment.paidAmount || matchingPayment.totalAmount || 0) : (inst.paidAmount || 0));

                if (Math.abs((inst.paidAmount || 0) - correctPaid) > 0.01) {
                    inst.paidAmount = correctPaid;
                    modified = true;
                }
            });

            for (let i = 0; i < adm.installments.length; i++) {
                const current = adm.installments[i];
                const netMonthly = (current.standardAmount || 0) - (current.waiverAmount || 0);
                const extraFees = current.monthNumber === 1 ? (Number(adm.admissionFee) || 0) : 0;

                const prevAdj = current.adjustmentAmount || 0;
                current.adjustmentAmount = 0;
                if (Math.abs(prevAdj) > 0.01) modified = true;

                const prevPayable = current.payableAmount || 0;
                current.payableAmount = Math.max(0, netMonthly + extraFees);
                if (Math.abs(prevPayable - current.payableAmount) > 0.01) modified = true;

                const prevStatus = current.status;
                if (current.paidAmount >= (current.payableAmount || 0) - 0.5 && (current.payableAmount || 0) > 0) {
                    current.status = 'PAID';
                } else if (current.payableAmount <= 0.5 && (current.standardAmount || 0) > 0 && (current.waiverAmount || 0) >= (current.standardAmount || 0)) {
                    current.status = 'PAID';
                } else if (current.paidAmount > 0.5) {
                    current.status = 'PARTIAL';
                } else {
                    current.status = 'PENDING';
                }
                if (prevStatus !== current.status) modified = true;
            }

            const calculatedTotalPaid = adm.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (adm.examFeePaid || 0) + (adm.additionalThingsPaid || 0);
            if (Math.abs((adm.totalPaidAmount || 0) - calculatedTotalPaid) > 0.01) {
                adm.totalPaidAmount = calculatedTotalPaid;
                modified = true;
            }

            if (modified) {
                await adm.save();
                updatedCount++;
            }
        }

        console.log(`Successfully reconciled and updated ${updatedCount} admissions.`);
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    } catch (err) {
        console.error("Reconciliation error:", err);
    }
}

reconcileBoardInstallments();
