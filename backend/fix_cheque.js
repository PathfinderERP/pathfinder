import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const paymentSchema = new mongoose.Schema({
    status: String,
    transactionId: String
}, { strict: false });

const Payment = mongoose.model('Payment', paymentSchema);

async function fixCheque() {
    try {
        const mongoUrl = process.env.MONGO_URL;
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUrl);
        console.log("Connected to MongoDB");

        const payment = await Payment.findOne({ transactionId: "123456" });
        if (payment) {
            console.log("Found payment:", payment._id, "Status:", payment.status);
            payment.status = "PENDING_CLEARANCE";
            await payment.save();
            console.log("Updated status to PENDING_CLEARANCE");
        } else {
            console.log("Payment not found for cheque #123456");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

fixCheque();
