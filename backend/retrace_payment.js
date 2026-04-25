
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './models/Payment/Payment.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Centre from './models/Master_data/Centre.js';
import { generateBillId } from './utils/billIdGenerator.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function retracePayment() {
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

        console.log("Retracing payment for:", adm.admissionNumber);

        const downPayment = 0; // From diagnostic
        const paidExamFee = 4500; // From diagnostic
        const paidAdditionalThings = 0; // From diagnostic
        const totalPaidToday = 4500;
        const centre = adm.centre;
        const receivedDate = adm.admissionDate;

        try {
            let centreObj = await Centre.findOne({ centreName: centre });
            if (!centreObj) {
                centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';
            console.log("Centre Code:", centreCode);

            const billId = await generateBillId(centreCode, receivedDate || new Date());
            console.log("Generated Bill ID:", billId);

            const taxableAmount = totalPaidToday / 1.18;
            const cgst = (totalPaidToday - taxableAmount) / 2;
            const sgst = cgst;

            const paymentRecord = new Payment({
                admission: adm._id,
                installmentNumber: 0,
                amount: (adm.installments.length > 0 ? adm.installments[0].payableAmount : adm.admissionFee) + (paidExamFee > 0 ? paidExamFee : 0),
                paidAmount: totalPaidToday,
                dueDate: adm.installments.length > 0 ? adm.installments[0].dueDate : adm.billingStartDate,
                paidDate: new Date(),
                receivedDate: receivedDate || new Date(),
                status: "PAID",
                paymentMethod: "CASH",
                billingMonth: new Date(adm.installments.length > 0 ? adm.installments[0].dueDate : adm.billingStartDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                recordedBy: adm.createdBy,
                billId: billId,
                courseFee: taxableAmount,
                cgst: cgst,
                sgst: sgst,
                totalAmount: totalPaidToday,
                boardCourseName: adm.boardCourseName,
                remarks: "DIAGNOSTIC RETRACE"
            });

            await paymentRecord.save();
            console.log("RETRACE SUCCESSFUL! Payment saved.");
            // We'll keep it there but the user will see it's a retrace
        } catch (err) {
            console.error("RETRACE FAILED!");
            console.error(err);
        }

        process.exit(0);
    } catch (error) {
        console.error("Process Error:", error);
        process.exit(1);
    }
}

retracePayment();
