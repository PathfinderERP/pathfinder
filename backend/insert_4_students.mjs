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
const CENTRE_NAME = "MALDA";
const CENTRE_CODE = "ML";

const studentsData = [
    {
        name: "SUBHRONEEP PAL",
        id: "PATH25024000",
        email: "sp4321@gmail.com",
        phone: "8918467210",
        courseId: "698ecc7dcc716f7a61ea3bfa", // Foundation Class X (Outstation) 2026-2027
        totalFees: 32000,
        paid: 6000,
        class: "10"
    },
    {
        name: "PRADIPTA DAS",
        id: "PATH25023087",
        email: "pd54311@gmail.com",
        phone: "7063621050",
        courseId: "698ecc71cc716f7a61ea3abb", // Foundation Class VIII (Out-station) 2026-2027
        totalFees: 29000,
        paid: 8000,
        class: "8"
    },
    {
        name: "ADRIJA GHOSH",
        id: "PATH25023174",
        email: "ag543212@gmail.com",
        phone: "9735363330",
        courseId: "698ecc71cc716f7a61ea3abb", // Foundation Class VIII (Out-station) 2026-2027
        totalFees: 29000,
        paid: 8000,
        class: "8"
    },
    {
        name: "SOUMEN DAS",
        id: "PATH25024337",
        email: "SD5421@GMAIL.COM",
        phone: "9474610764",
        courseId: "698ecc73cc716f7a61ea3ae2", // Foundation Class IX (Out-station) 2026-2027
        totalFees: 29000,
        paid: 6000,
        class: "9"
    }
];

async function insertData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        for (const data of studentsData) {
            console.log(`Processing student: ${data.name}...`);

            // 1. Create Student
            const student = new Student({
                studentsDetails: [{
                    studentName: data.name,
                    studentEmail: data.email,
                    mobileNum: data.phone,
                    whatsappNumber: data.phone,
                    centre: CENTRE_NAME,
                    programme: 'CRP'
                }],
                isEnrolled: true,
                status: 'Active'
            });
            const savedStudent = await student.save();

            // Fetch Course for mapping details
            const course = await Course.findById(data.courseId);
            if (!course) throw new Error(`Course not found for ID: ${data.courseId}`);

            // Calculate GST breakdown (assuming 18% inclusive)
            const dpBaseAmount = data.paid / 1.18;
            const dpCgst = dpBaseAmount * 0.09;
            const dpSgst = dpBaseAmount * 0.09;
            const dpCourseFee = data.paid - dpCgst - dpSgst;

            const totalFeesBase = data.totalFees / 1.18;
            const totalCgst = totalFeesBase * 0.09;
            const totalSgst = totalFeesBase * 0.09;
            const totalBase = data.totalFees - totalCgst - totalSgst;

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
                academicSession: "2026-2027",
                baseFees: parseFloat(totalBase.toFixed(2)),
                cgstAmount: parseFloat(totalCgst.toFixed(2)),
                sgstAmount: parseFloat(totalSgst.toFixed(2)),
                totalFees: data.totalFees,
                downPayment: data.paid,
                downPaymentStatus: "PAID",
                downPaymentMethod: "CASH",
                downPaymentReceivedDate: new Date(),
                remainingAmount: data.totalFees - data.paid,
                numberOfInstallments: 0,
                installmentAmount: 0,
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

        console.log("\nAll students inserted successfully!");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
