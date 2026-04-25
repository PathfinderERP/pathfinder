
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './models/Payment/Payment.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Centre from './models/Master_data/Centre.js';
import { generateBillId } from './utils/billIdGenerator.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function healStudents() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const targetAdmissions = ["PATH26002638", "PATH26002639"]; // RAIMA already healed
        
        for (const admissionNumber of targetAdmissions) {
            console.log(`\nProcessing Healing for ${admissionNumber}...`);
            const adm = await BoardCourseAdmission.findOne({ admissionNumber });
            
            if (!adm) {
                console.error(`Admission ${admissionNumber} not found`);
                continue;
            }

            // Check if payment already exists (safety check)
            const existingPayment = await Payment.findOne({ admission: adm._id });
            if (existingPayment) {
                console.log(`Payment already exists for ${admissionNumber}. Skipping.`);
                continue;
            }

            const totalPaidToday = adm.totalPaidAmount;
            const paidExamFee = adm.examFeePaid;
            const centre = adm.centre;
            const receivedDate = adm.admissionDate;

            let centreObj = await Centre.findOne({ centreName: centre });
            if (!centreObj) {
                centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            const billId = await generateBillId(centreCode, receivedDate || new Date());
            console.log(`Generated Bill ID for ${admissionNumber}: ${billId}`);

            const taxableAmount = totalPaidToday / 1.18;
            const cgst = (totalPaidToday - taxableAmount) / 2;
            const sgst = cgst;

            const paymentRecord = new Payment({
                admission: adm._id,
                installmentNumber: 0,
                amount: (adm.installments.length > 0 ? adm.installments[0].payableAmount : adm.admissionFee) + (paidExamFee > 0 ? paidExamFee : 0),
                paidAmount: totalPaidToday,
                dueDate: adm.installments.length > 0 ? adm.installments[0].dueDate : adm.billingStartDate,
                paidDate: adm.admissionDate, // Use admission date for consistency
                receivedDate: receivedDate || new Date(),
                status: "PAID",
                paymentMethod: "CASH", // Default to CASH for recovery
                billingMonth: new Date(adm.installments.length > 0 ? adm.installments[0].dueDate : adm.billingStartDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                recordedBy: adm.createdBy,
                billId: billId,
                courseFee: taxableAmount,
                cgst: cgst,
                sgst: sgst,
                totalAmount: totalPaidToday,
                boardCourseName: adm.boardCourseName,
                remarks: "System Recovery: Restored missing bill"
            });

            await paymentRecord.save();
            console.log(`SUCCESS: Bill generated for ${admissionNumber}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Heal Process Error:", error);
        process.exit(1);
    }
}

healStudents();
