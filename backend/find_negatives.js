import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "./models/Admission/Admission.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const adms = await Admission.find({ "paymentBreakdown.amount": { $lt: -1 } }).lean();
        console.log("Admissions with significant negative installments count:", adms.length);
        for (const a of adms) {
            console.log("Admission Number:", a.admissionNumber);
            console.log("Installment Amounts:", a.paymentBreakdown.map(p => ({
                num: p.installmentNumber,
                amount: p.amount,
                status: p.status,
                paidAmount: p.paidAmount,
                remarks: p.remarks
            })));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
