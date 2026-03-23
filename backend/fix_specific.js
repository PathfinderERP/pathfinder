import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const paymentSchema = new mongoose.Schema({
    status: String,
    transactionId: String
}, { strict: false });

const Payment = mongoose.model('Payment', paymentSchema);

async function fixSpecificCheque() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const payment = await Payment.findById("69be4a8717239182814d099d");
        if (payment) {
            console.log("Found payment:", payment._id, "Current Status:", payment.status);
            payment.status = "PENDING_CLEARANCE";
            await payment.save();
            console.log("Updated status to PENDING_CLEARANCE");
        } else {
            console.log("Payment not found with ID 69be4a8717239182814d099d");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

fixSpecificCheque();
