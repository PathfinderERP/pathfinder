
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './backend/models/Payment/Payment.js';

dotenv.config({ path: './backend/.env' });

async function checkTodayPayments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        console.log(`Checking payments between ${startOfToday.toISOString()} and ${endOfToday.toISOString()}`);

        const payments = await Payment.find({
            paidDate: { $gte: startOfToday, $lte: endOfToday }
        }).populate('admission');

        console.log(`Found ${payments.length} payments for today.`);

        payments.forEach((p, idx) => {
            console.log(`[${idx + 1}] ID: ${p._id}, Amount: ${p.paidAmount}, Method: ${p.paymentMethod}, Status: ${p.status}, CreatedAt: ${p.createdAt.toISOString()}, PaidDate: ${p.paidDate?.toISOString()}, ReceivedDate: ${p.receivedDate?.toISOString()}`);
            if (p.admission) {
                console.log(`    Admission: ${p.admission._id}, Centre: ${p.admission.centre}, Student: ${p.admission.student}`);
            }
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTodayPayments();
