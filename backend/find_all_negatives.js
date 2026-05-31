import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "./models/Admission/Admission.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const negativeAdmissions = await Admission.find({
            "paymentBreakdown.amount": { $lt: 0 }
        }).lean();

        console.log(`Found ${negativeAdmissions.length} admissions with negative installments.\n`);

        for (const adm of negativeAdmissions) {
            console.log(`==========================================`);
            console.log(`Admission No: ${adm.admissionNumber}`);
            console.log(`Total Fees: ${adm.totalFees}`);
            console.log(`Total Paid: ${adm.totalPaidAmount}`);
            console.log(`Remaining: ${adm.remainingAmount}`);
            console.log(`Payment Status: ${adm.paymentStatus}`);
            console.log(`Down Payment: ${adm.downPayment}`);
            console.log(`Installments:`);
            adm.paymentBreakdown.forEach(inst => {
                console.log(`  Inst #${inst.installmentNumber}: Amount=${inst.amount}, Paid=${inst.paidAmount}, Status=${inst.status}, DueDate=${new Date(inst.dueDate).toLocaleDateString('en-GB')}, Remarks="${inst.remarks || ''}"`);
            });
            console.log(`==========================================\n`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
