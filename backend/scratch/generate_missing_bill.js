import mongoose from "mongoose";
import dotenv from "dotenv";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import Payment from "../models/Payment/Payment.js";
import Centre from "../models/Master_data/Centre.js";
import { generateBillId } from "../utils/billIdGenerator.js";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const admissionId = "69f30259a77c1c938fae939b";
        const admission = await BoardCourseAdmission.findById(admissionId);

        if (!admission) {
            console.log("Admission not found");
            process.exit(0);
        }

        console.log("Found Admission:", admission.admissionNumber, "for", admission.studentName);

        // check if payment already exists (double check)
        const existingPayment = await Payment.findOne({ admission: admissionId });
        if (existingPayment) {
            console.log("Payment record already exists:", existingPayment.billId);
            process.exit(0);
        }

        // Prepare details for the bill
        const totalPaidToday = 10030;
        const paymentMethod = "UPI"; // User said "online", which usually maps to UPI/ONLINE in this system
        const transactionId = "586469";
        const centre = admission.centre;

        let centreObj = await Centre.findOne({ centreName: centre });
        if (!centreObj) {
            centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, 'i') } });
        }
        const centreCode = centreObj ? centreObj.enterCode : 'GEN';
        
        // Generate Bill ID
        const billId = await generateBillId(centreCode, new Date());
        console.log("Generated Bill ID:", billId);

        const taxableAmount = totalPaidToday / 1.18;
        const cgst = (totalPaidToday - taxableAmount) / 2;
        const sgst = cgst;

        const billCourseName = `${admission.boardCourseName} + Examination`;

        const paymentRecord = new Payment({
            admission: admission._id,
            installmentNumber: 0,
            amount: 10030,
            paidAmount: totalPaidToday,
            dueDate: admission.createdAt,
            paidDate: new Date(),
            receivedDate: new Date(),
            status: "PAID",
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            billingMonth: new Date(admission.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
            recordedBy: new mongoose.Types.ObjectId("6970c42b9590082b81674d06"), // Using the createdBy ID from admission
            billId: billId,
            courseFee: taxableAmount,
            cgst: cgst,
            sgst: sgst,
            totalAmount: totalPaidToday,
            boardCourseName: billCourseName,
            remarks: "Generated missing bill for Board Admission (Exam Fee)"
        });

        await paymentRecord.save();
        console.log("Successfully created payment record and generated bill.");

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
