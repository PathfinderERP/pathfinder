import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const paymentSchema = new mongoose.Schema({
    status: String,
    transactionId: String
}, { strict: false });

const Payment = mongoose.model('Payment', paymentSchema);

async function checkDuplicates() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const payments = await Payment.find({ transactionId: "123456" });
        console.log(`Found ${payments.length} payments with transactionId 123456`);
        
        payments.forEach(p => {
            console.log(`ID: ${p._id}, Status: ${p.status}, Amount: ${p.paidAmount}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkDuplicates();
