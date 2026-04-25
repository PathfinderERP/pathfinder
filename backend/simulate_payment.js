
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './models/Payment/Payment.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function simulatePayment() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // Target: RAIMA MUKHERJEE
        const admId = "69ecb83501da31e50d16ff2c";
        const adm = await BoardCourseAdmission.findById(admId).lean();
        
        if (!adm) {
            console.error("Admission not found");
            process.exit(1);
        }

        console.log("Simulating payment record creation for:", adm.admissionNumber);

        const paymentRecord = new Payment({
            admission: adm._id,
            installmentNumber: 0,
            amount: 4500,
            paidAmount: 4500,
            dueDate: new Date(),
            receivedDate: new Date(),
            status: "PAID",
            paymentMethod: "CASH",
            billId: "SIMULATED_TEST_" + Date.now(),
            totalAmount: 4500,
            boardCourseName: "TEST NCRP",
            recordedBy: null
        });

        try {
            await paymentRecord.save();
            console.log("Payment record saved SUCCESSFULLY!");
            // Delete the test record
            await Payment.deleteOne({ _id: paymentRecord._id });
            console.log("Test record deleted.");
        } catch (saveErr) {
            console.error("SAVE FAILED with error:");
            console.error(JSON.stringify(saveErr, null, 2));
            if (saveErr.errors) {
                console.error("Validation Errors:", Object.keys(saveErr.errors));
                for (let key in saveErr.errors) {
                    console.error(`- ${key}: ${saveErr.errors[key].message}`);
                }
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Process Error:", error);
        process.exit(1);
    }
}

simulatePayment();
