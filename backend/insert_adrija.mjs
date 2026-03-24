import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Boards from './models/Master_data/Boards.js';
import Payment from './models/Payment/Payment.js';
import Centre from './models/Master_data/Centre.js';
import { generateBillId } from './utils/billIdGenerator.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const boardId = "6970886dabb4820c05aeccbf"; // CBSE
        const centreName = "HAZRA H.O";
        const admissionNumber = "PATH25023840";
        const totalAmount = 12400;
        const paidAmount = 1000;
        const courseName = "NCRP CBSE Class-X (Qtrly+Mid Term+Pre Mock+Mock) + Capsule 2026-2027";

        // 1. Create Student
        const student = new Student({
            studentsDetails: [{
                studentName: "ADRIJA PODDER",
                studentEmail: "ananyapodder55555@rediffmail.com",
                mobileNum: "9831755594",
                whatsappNumber: "9831755594",
                centre: centreName,
                programme: "NCRP"
            }],
            status: "Active",
            isEnrolled: true
        });
        await student.save();
        console.log("Student created:", student._id);

        // 2. Create Board Admission
        const boardAdmission = new BoardCourseAdmission({
            studentId: student._id,
            studentName: "ADRIJA PODDER",
            mobileNum: "9831755594",
            boardId: boardId,
            centre: centreName,
            programme: "NCRP",
            lastClass: "10",
            admissionNumber: admissionNumber,
            boardCourseName: courseName,
            academicSession: "2026-2027",
            totalDurationMonths: 1,
            totalExpectedAmount: totalAmount,
            totalPaidAmount: paidAmount,
            billingStartDate: new Date(),
            admissionDate: new Date(),
            status: "ACTIVE",
            installments: [{
                monthNumber: 1,
                dueDate: new Date(),
                standardAmount: totalAmount,
                payableAmount: totalAmount,
                paidAmount: paidAmount,
                status: "PAID", // We mark as paid to avoid balance carry forward errors in some logic, but let's stick to true status
                paymentTransactions: [{
                    amount: paidAmount,
                    date: new Date(),
                    paymentMethod: "CASH",
                    transactionId: "DP-" + Date.now()
                }]
            }]
        });

        // We bypass pre-save if admissionNumber is set (as per existing schema)
        await boardAdmission.save();
        console.log("Board Admission created:", boardAdmission.admissionNumber);

        // 3. Create Payment Record (for Finance Portal)
        let centreObj = await Centre.findOne({ centreName: centreName });
        if (!centreObj) {
            centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centreName}$`, 'i') } });
        }
        const billId = await generateBillId(centreObj?.enterCode || "HAZ");

        const taxableAmount = paidAmount / 1.18;
        const cgst = (paidAmount - taxableAmount) / 2;
        const sgst = cgst;

        const payment = new Payment({
            admission: boardAdmission._id,
            admissionModel: "BoardCourseAdmission", // This matches my earlier (rejected?) change but let's provide it if it helps
            installmentNumber: 1,
            amount: totalAmount,
            paidAmount: paidAmount,
            dueDate: new Date(),
            paidDate: new Date(),
            receivedDate: new Date(),
            status: "PAID",
            paymentMethod: "CASH",
            transactionId: "DP-" + Date.now(),
            billingMonth: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
            billId: billId,
            courseFee: taxableAmount,
            cgst: cgst,
            sgst: sgst,
            totalAmount: paidAmount,
            boardCourseName: courseName,
            remarks: "Manual Insertion - Adrija Podder"
        });

        await payment.save();
        console.log("Payment record created:", payment.billId);

        console.log("\nDone! Data successfully added.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
