import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Payment from './models/Payment/Payment.js';
import Course from './models/Master_data/Courses.js';
import { generateBillId } from './utils/billIdGenerator.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Malay Maity
const CENTRE_NAME = "BALLY";
const CENTRE_CODE = "BL";

const studentsData = [
    {
        name: "SRITAMA CHATTERJEE",
        id: "PATH24001944",
        phone: "0000000000", // No phone provided in excel, using placeholder
        courseId: "6985e46bfc0bd6eb8119aeac", // CRP NEET 2Years 2024-2026
        totalFees: 120915,
        paid: 99527,
        session: "2024-2026",
        dueInstallments: 2
    },
    {
        name: "RUPANJANA BANDYOPADHYAY",
        id: "PATH26001531",
        phone: "0000000000",
        courseId: "6971d4707b7d1cb9d0af9e53", // CRP NEET 1Year  2026-2027
        totalFees: 60000,
        paid: 30000,
        session: "2026-2027",
        dueInstallments: 5
    },
    {
        name: "AVIRAJ PAL",
        id: "PATH26001548",
        phone: "0000000000",
        courseId: "6985e2693868c72bbc435f89", // Foundation Class VII (Instation) 2026-2027
        totalFees: 30000,
        paid: 11800,
        session: "2026-2027",
        dueInstallments: 6
    }
];

async function insertData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        for (const data of studentsData) {
            console.log(`Processing student: ${data.name}...`);

            // Fetch Course for mapping details
            const course = await Course.findById(data.courseId);
            if (!course) {
                console.error(`❌ Course not found for ID: ${data.courseId}`);
                continue;
            }

            // 1. Create Student
            const student = new Student({
                studentsDetails: [{
                    studentName: data.name,
                    mobileNum: data.phone,
                    whatsappNumber: data.phone,
                    centre: CENTRE_NAME,
                    programme: course.programme || 'CRP'
                }],
                isEnrolled: true,
                status: 'Active'
            });
            const savedStudent = await student.save();

            // Calculate GST breakdown (18% inclusive)
            const dpBaseAmount = data.paid / 1.18;
            const dpCgst = dpBaseAmount * 0.09;
            const dpSgst = dpBaseAmount * 0.09;
            const dpCourseFee = data.paid - dpCgst - dpSgst;

            const totalFeesBase = data.totalFees / 1.18;
            const totalCgst = totalFeesBase * 0.09;
            const totalSgst = totalFeesBase * 0.09;
            const totalBase = data.totalFees - totalCgst - totalSgst;

            const remainingAmount = data.totalFees - data.paid;
            const instAmount = data.dueInstallments > 0 ? (remainingAmount / data.dueInstallments) : 0;

            // 2. Create Admission
            const admission = new Admission({
                student: savedStudent._id,
                admissionType: "NORMAL",
                course: data.courseId,
                class: course.class,
                examTag: course.examTag,
                department: course.department,
                centre: CENTRE_NAME,
                admissionNumber: data.id,
                academicSession: data.session,
                baseFees: parseFloat(totalBase.toFixed(2)),
                cgstAmount: parseFloat(totalCgst.toFixed(2)),
                sgstAmount: parseFloat(totalSgst.toFixed(2)),
                totalFees: data.totalFees,
                downPayment: data.paid,
                downPaymentStatus: "PAID",
                downPaymentMethod: "CASH",
                downPaymentReceivedDate: new Date(),
                remainingAmount: parseFloat(remainingAmount.toFixed(2)),
                numberOfInstallments: data.dueInstallments,
                installmentAmount: parseFloat(instAmount.toFixed(2)),
                paymentStatus: (data.paid >= data.totalFees) ? "COMPLETED" : "PARTIAL",
                totalPaidAmount: data.paid,
                createdBy: ADMIN_ID
            });
            const savedAdmission = await admission.save();

            // 3. Create Payment record (Down Payment)
            const billId = await generateBillId(CENTRE_CODE);
            const payment = new Payment({
                admission: savedAdmission._id,
                installmentNumber: 0, // Down Payment
                amount: data.paid,
                paidAmount: data.paid,
                dueDate: new Date(),
                paidDate: new Date(),
                receivedDate: new Date(),
                status: "PAID",
                paymentMethod: "CASH",
                billId: billId,
                recordedBy: ADMIN_ID,
                cgst: parseFloat(dpCgst.toFixed(2)),
                sgst: parseFloat(dpSgst.toFixed(2)),
                courseFee: parseFloat(dpCourseFee.toFixed(2)),
                totalAmount: data.paid
            });
            await payment.save();

            console.log(`✅ Inserted ${data.name} (Admission: ${data.id}, Bill: ${billId})`);
        }

        console.log("\nBatch insertion for BALLY center completed!");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
