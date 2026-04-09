
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Payment from './models/Payment/Payment.js';
import User from './models/User.js';

async function addPayment() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const admissionId = "69c155512791e14a99e923f7";
        const studentId   = "69c155512791e14a99e923f5";
        const totalPaid   = 93000;

        const adminUser = await User.findOne({ role: { $regex: /admin/i } });

        const payment = new Payment({
            admission:         admissionId,
            installmentNumber: 0,
            amount:            totalPaid,
            paidAmount:        totalPaid,
            dueDate:           new Date(),
            paidDate:          new Date(),
            receivedDate:      new Date(),
            status:            'PAID',
            paymentMethod:     'CASH',
            createdBy:         adminUser._id
        });

        await payment.save();
        console.log("✅ Payment created:", payment._id);
        await mongoose.disconnect();
    } catch (err) {
        console.error("ERROR:", err.message);
        if (err.errors) {
            Object.keys(err.errors).forEach(k => console.error("-", k, ":", err.errors[k].message));
        }
    }
}
addPayment();
