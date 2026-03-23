import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { rejectCheque } from './controllers/Finance/chequeController.js';
import Payment from './models/Payment/Payment.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';

dotenv.config();

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const paymentId = '69be5979db74974f5389eb72';
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            console.error("Payment not found");
            process.exit(1);
        }

        const admissionId = payment.admission;
        console.log("Testing rejection for payment:", paymentId, "Admission:", admissionId);

        const req = {
            params: { paymentId },
            body: { reason: "Test rejection for board course" },
            user: { id: '64d26dc7f7a4a904a8b7c3d1' } // Mock user ID
        };

        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.data = data;
                console.log("Response Status:", this.statusCode);
                console.log("Response Data:", data);
            }
        };

        // Call the controller
        await rejectCheque(req, res);

        // Verify the database state
        const updatedPayment = await Payment.findById(paymentId);
        console.log("Updated Payment Status:", updatedPayment.status);

        const updatedAdmission = await BoardCourseAdmission.findById(admissionId);
        console.log("Admission Installments count:", updatedAdmission.installments.length);
        console.log("Looking for Installment Number:", payment.installmentNumber);
        
        const inst = updatedAdmission.installments.find(i => i.monthNumber === payment.installmentNumber);
        if (inst) {
            console.log("Updated Installment Status:", inst.status);
            console.log("Updated Installment Paid Amount:", inst.paidAmount);
        } else {
            console.log("Installment not found in admission record!");
            console.log("Available Month Numbers:", updatedAdmission.installments.map(i => i.monthNumber));
        }

        process.exit(0);
    } catch (err) {
        console.error("Test Error:", err);
        process.exit(1);
    }
}

runTest();
