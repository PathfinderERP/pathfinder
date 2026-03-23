import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const paymentSchema = new mongoose.Schema({
    status: String,
    transactionId: String
}, { strict: false });

const Payment = mongoose.model('Payment', paymentSchema);

async function fixCheque() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
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
