
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import LeadManagement from './models/LeadManagement.js';
import Course from './models/Master_data/Courses.js';
import User from './models/User.js';
import Payment from './models/Payment/Payment.js';
import { generateBillId } from './utils/billIdGenerator.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // 1. Find the admin user to use as creator
        const adminUser = await User.findOne({ role: /Super Admin/i });
        const creatorId = adminUser ? adminUser._id : null;

        // 2. Data from User Request
        const studentName = "Rohit Saha";
        const admissionNumber = "PATH25007038";
        const courseName = "NEET 2Years 2026-2028";
        const admissionDate = new Date("2026-03-08");
        const targetTotalFees = 140000;
        const downPayment = 25000;
        const numberOfInstallments = 18;
        const paymentMethod = "CASH";
        const centreName = "CHANDANNAGAR";

        // 3. Find Lead to get extra info if possible
        const lead = await LeadManagement.findOne({ name: /Rohit Saha/i });
        console.log('Lead info:', lead ? 'Found' : 'Not Found');

        // 4. Find Course
        const course = await Course.findOne({ courseName: courseName });
        if (!course) {
            console.error('Course not found');
            process.exit(1);
        }

        // 5. Create or Update Student
        let student = await Student.findOne({ 
            $or: [
                { "studentsDetails.mobileNum": lead?.phoneNumber || "8335886789" },
                { "studentsDetails.studentName": studentName }
            ]
        });

        if (!student) {
            student = new Student({
                studentsDetails: [{
                    studentName: studentName.toUpperCase(),
                    centre: centreName,
                    mobileNum: lead?.phoneNumber || "8335886789",
                    whatsappNumber: lead?.phoneNumber || "8335886789",
                    schoolName: lead?.schoolName || "N/A",
                    studentEmail: lead?.email || "N/A",
                    source: lead?.source || "DIRECT",
                }],
                course: course._id,
                isEnrolled: true,
                status: 'Active'
            });
            await student.save();
            console.log('Student created:', student._id);
        } else {
            student.isEnrolled = true;
            await student.save();
            console.log('Student updated:', student._id);
        }

        // 6. Calculate Fees and Waiver
        const baseFees = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
        // taxableBase = baseFees
        // totalExpectedWithGstIfNoDiscount = baseFees * 1.18
        const totalExpectedWithGst = baseFees * 1.18;
        const feeWaiver = totalExpectedWithGst - targetTotalFees;

        const taxableAmount = parseFloat((targetTotalFees / 1.18).toFixed(3));
        const cgstAmount = parseFloat((taxableAmount * 0.09).toFixed(3));
        const sgstAmount = parseFloat((taxableAmount * 0.09).toFixed(3));

        const remainingAmount = targetTotalFees - downPayment;
        const installmentAmount = Math.ceil(remainingAmount / numberOfInstallments);

        // 7. Payment Breakdown
        const paymentBreakdown = [];
        for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(admissionDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            paymentBreakdown.push({
                installmentNumber: i + 1,
                dueDate: dueDate,
                amount: i === numberOfInstallments - 1
                    ? remainingAmount - (installmentAmount * (numberOfInstallments - 1))
                    : installmentAmount,
                status: "PENDING"
            });
        }

        // 8. Create Admission
        const existingAdmission = await Admission.findOne({ admissionNumber: admissionNumber });
        if (existingAdmission) {
            console.log('Admission already exists with number:', admissionNumber);
        } else {
            const admission = new Admission({
                student: student._id,
                admissionType: "NORMAL",
                admissionNumber: admissionNumber,
                course: course._id,
                class: course.class,
                examTag: course.examTag,
                department: course.department,
                centre: centreName,
                academicSession: course.courseSession || "2026-2028",
                baseFees: baseFees,
                discountAmount: Number(feeWaiver.toFixed(2)),
                cgstAmount,
                sgstAmount,
                totalFees: targetTotalFees,
                downPayment: downPayment,
                remainingAmount: remainingAmount,
                numberOfInstallments: numberOfInstallments,
                installmentAmount: installmentAmount,
                paymentBreakdown: paymentBreakdown,
                feeStructureSnapshot: course.feesStructure,
                remarks: "Historical Data Migration",
                createdBy: creatorId,
                totalPaidAmount: downPayment,
                paymentStatus: (downPayment >= targetTotalFees) ? "COMPLETED" : "PARTIAL",
                downPaymentStatus: "PAID",
                downPaymentReceivedDate: admissionDate,
                admissionDate: admissionDate
            });

            await admission.save();
            console.log('Admission created:', admission._id);

            // 9. Generate Bill ID and Payment Record for Down Payment
            const billId = await generateBillId("CN"); // Chandannagar code is CN
            const paymentRecord = new Payment({
                admission: admission._id,
                installmentNumber: 0,
                amount: downPayment, // taxable part or full? usually amount is full for display
                paidAmount: downPayment,
                dueDate: admissionDate,
                paidDate: admissionDate,
                receivedDate: admissionDate,
                status: "PAID",
                paymentMethod: paymentMethod,
                billId: billId,
                totalAmount: downPayment,
                courseFee: parseFloat((downPayment / 1.18).toFixed(2)),
                cgst: parseFloat(((downPayment - (downPayment / 1.18)) / 2).toFixed(2)),
                sgst: parseFloat(((downPayment - (downPayment / 1.18)) / 2).toFixed(2)),
                recordedBy: creatorId,
                remarks: "Down Payment at Admission"
            });
            await paymentRecord.save();
            console.log('Payment record created with Bill ID:', billId);

            // 10. Update Lead if it exists
            if (lead) {
                // Should we mark it as converted? 
                // There isn't an explicit status for the whole lead, but we could update followUps
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
