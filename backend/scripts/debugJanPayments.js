import mongoose from 'mongoose';
import 'dotenv/config';

const checkPayments = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const Payment = mongoose.model('Payment', new mongoose.Schema({
            paidDate: Date,
            receivedDate: Date,
            status: String,
            paidAmount: Number,
            admission: mongoose.Schema.Types.ObjectId,
            createdAt: Date
        }));

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        console.log(`Searching for payments between ${start.toISOString()} and ${end.toISOString()}`);

        const janPayments = await Payment.find({
            status: "PAID",
            $or: [
                { receivedDate: { $gte: start, $lte: end } },
                { paidDate: { $gte: start, $lte: end } }
            ]
        });

        console.log(`Found ${janPayments.length} payments in January 2026`);
        if (janPayments.length > 0) {
            console.log("Sample payment:", janPayments[0]);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkPayments();
