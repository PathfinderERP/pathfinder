import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Payment from './models/Payment/Payment.js';
import Course from './models/Master_data/Courses.js';
import Centre from './models/Master_data/Centre.js';
import { generateBillId } from './utils/billIdGenerator.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = "6970c4129590082b81674b65"; // Malay Maity
const CENTRE_NAME = "BAGNAN";

const studentsData = [
    {
        name: "SADHANA DAS",
        phone: "6290879307",
        email: "sadhanadas@pathneet.com",
        enroll: "PATH24002177",
        commitedFees: 74500,
        totalPaid: 59500,
        courseName: "CRP NEET 2Years 2024-2026",
        courseId: "6985e46bfc0bd6eb8119aeac"
    },
    {
        name: "RUPKATHA MAITY",
        phone: "9051010680",
        email: "rupkathamaity@pathneet.com",
        enroll: "PATH24003042",
        commitedFees: 130000,
        totalPaid: 125000,
        courseName: "CRP NEET 2Years 2024-2026",
        courseId: "6985e46bfc0bd6eb8119aeac"
    },
    {
        name: "ALENA PARVIN",
        phone: "8653084228",
        email: "alenaparvin@pathneet.com",
        enroll: "PATH24003574",
        commitedFees: 25000,
        totalPaid: 23000,
        courseName: "NEET REPEATER (NS) 2025-2026",
        courseId: "6985e5f9fc0bd6eb8119e339"
    }
];

async function insertData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        const centre = await Centre.findOne({ centreName: CENTRE_NAME });
        const centreCode = centre ? centre.enterCode : 'BG'; // Default to BG if not found

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
                    programme: data.courseName.includes("CRP") ? "CRP" : "NCRP"
                }],
                isEnrolled: true,
                status: 'Active'
            });
            const savedStudent = await student.save();

            // Fetch Course for mapping details
            const course = await Course.findById(data.courseId);
            if (!course) throw new Error(`Course not found for ID: ${data.courseId}`);

            // Calculate GST breakdown (assuming 18% inclusive)
            // Note: Total Paid is what we record as payment. Commited Fees is totalFees.
            const dpBaseAmount = data.totalPaid / 1.18;
            const dpCgst = dpBaseAmount * 0.09;
            const dpSgst = dpBaseAmount * 0.09;
            const dpCourseFee = data.totalPaid - dpCgst - dpSgst;

            const totalFeesBase = data.commitedFees / 1.18;
            const totalCgst = totalFeesBase * 0.09;
            const totalSgst = totalFeesBase * 0.09;
            const totalBase = data.commitedFees - totalCgst - totalSgst;

            // Session inference
            let session = "2024-2025";
            if (data.courseName.includes("2024-2026")) session = "2024-2026";
            if (data.courseName.includes("2025-2026")) session = "2025-2026";

            const remainingAmount = data.commitedFees - data.totalPaid;

            // 2. Create Admission
            const admission = new Admission({
                student: savedStudent._id,
                admissionType: "NORMAL",
                course: data.courseId,
                class: course.class,
                examTag: course.examTag,
                department: course.department,
                centre: CENTRE_NAME,
                admissionNumber: data.enroll,
                academicSession: session,
                baseFees: parseFloat(totalBase.toFixed(2)),
                cgstAmount: parseFloat(totalCgst.toFixed(2)),
                sgstAmount: parseFloat(totalSgst.toFixed(2)),
                totalFees: data.commitedFees,
                downPayment: data.totalPaid,
                downPaymentStatus: "PAID",
                downPaymentMethod: "CASH", // Default
                downPaymentReceivedDate: new Date(),
                remainingAmount: remainingAmount,
                numberOfInstallments: remainingAmount > 0 ? 1 : 0,
                installmentAmount: remainingAmount,
                paymentStatus: remainingAmount <= 0 ? "COMPLETED" : "PARTIAL",
                totalPaidAmount: data.totalPaid,
                createdBy: ADMIN_ID,
                sectionAllotment: {
                    omrCode: data.enroll // Reusing enroll if OMR not provided separately
                }
            });
            const savedAdmission = await admission.save();

            // 3. Create Payment record
            const billId = await generateBillId(centreCode);
            const payment = new Payment({
                admission: savedAdmission._id,
                installmentNumber: 0,
                amount: data.totalPaid,
                paidAmount: data.totalPaid,
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
                totalAmount: data.totalPaid
            });
            await payment.save();

            console.log(`✅ Inserted ${data.name} (Admission: ${data.enroll}, Bill: ${billId})`);
        }

        console.log("\nAll Bagnan students inserted successfully!");

    } catch (err) {
        console.error("Insertion failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

insertData();
