
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import User from './models/User.js';
import Payment from './models/Payment/Payment.js';

async function insertPratikBiswas() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const studentName   = "PRATIK BISWAS";
        const admissionNumber = "PATH24007893";
        const courseId      = "6985e5e5fc0bd6eb8119e061"; // JEE MAINS & ADV. (NS)+WBJEE 2Years 2025-2027
        const centreId      = "697088baabb4820c05aecdb5"; // DUMDUM
        const examTagId     = "6970868eabb4820c05aeca3e";
        const departmentId  = "697086a2abb4820c05aeca52";
        const committedAmount = 130000;
        const totalPaid       = 93000;
        const remainingAmount = committedAmount - totalPaid; // 37000

        // Installments: divide 37000 into 6
        const installmentCount  = 6;
        const baseInstallment   = Math.floor(remainingAmount / installmentCount); // 6166
        const extraAmount       = remainingAmount - (baseInstallment * installmentCount); // remainder
        const firstInstallment  = baseInstallment + extraAmount;

        // Find an admin user
        const adminUser = await User.findOne({ role: { $regex: /admin/i } });
        if (!adminUser) { console.error("No admin user found"); process.exit(1); }
        console.log("Using admin:", adminUser.name);

        // 1. Create or find Student
        let student = await Student.findOne({ name: studentName });
        if (!student) {
            student = new Student({
                name: studentName,
                createdBy: adminUser._id,
                enrollmentStatus: 'ENROLLED'
            });
            await student.save();
            console.log("Created Student:", student._id);
        } else {
            console.log("Student already exists:", student._id);
        }

        // Build payment breakdown
        const paymentBreakdown = [];
        // Slot 0 = down payment (already paid)
        paymentBreakdown.push({
            installmentNumber: 0,
            dueDate: new Date(),
            amount: totalPaid,
            status: 'PAID',
            paidDate: new Date(),
            receivedDate: new Date(),
            paidAmount: totalPaid,
            paymentMethod: 'CASH'
        });
        // Slots 1-6 = future installments
        for (let i = 1; i <= installmentCount; i++) {
            const amt = i === 1 ? firstInstallment : baseInstallment;
            const due = new Date();
            due.setMonth(due.getMonth() + i);
            paymentBreakdown.push({
                installmentNumber: i,
                dueDate: due,
                amount: amt,
                status: 'PENDING',
                paidAmount: 0,
                paymentMethod: null
            });
        }

        // 2. Create Admission
        const admission = new Admission({
            student:              student._id,
            admissionNumber:      admissionNumber,
            course:               courseId,
            centre:               centreId,
            examTag:              examTagId,
            department:           departmentId,
            academicSession:      "2025-2027",
            baseFees:             committedAmount,
            cgstAmount:           0,
            sgstAmount:           0,
            totalFees:            committedAmount,
            downPayment:          totalPaid,
            downPaymentMethod:    'CASH',
            remainingAmount:      remainingAmount,
            numberOfInstallments: installmentCount,
            installmentAmount:    baseInstallment,
            paymentBreakdown:     paymentBreakdown,
            paymentStatus:        'PARTIAL',
            totalPaidAmount:      totalPaid,
            admissionStatus:      'ACTIVE',
            createdBy:            adminUser._id
        });

        await admission.save();
        console.log("Created Admission:", admission._id);

        // 3. Create Payment Record for 93,000
        const payment = new Payment({
            studentId:         student._id,
            admissionId:       admission._id,
            installmentNumber: 0,
            amount:            totalPaid,
            status:            'PAID',
            paymentMethod:     'CASH',
            transactionId:     'MANUAL_' + Date.now(),
            totalAmount:       totalPaid,
            createdBy:         adminUser._id
        });
        await payment.save();
        console.log("Created Payment:", payment._id);

        console.log("\n✅ SUCCESS: PRATIK BISWAS data inserted successfully!");
        console.log(`   Student ID:   ${student._id}`);
        console.log(`   Admission ID: ${admission._id}`);
        console.log(`   Committed:    ₹${committedAmount}`);
        console.log(`   Paid:         ₹${totalPaid}`);
        console.log(`   Remaining:    ₹${remainingAmount} in ${installmentCount} installments`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("ERROR:", error.message);
        if (error.errors) {
            Object.keys(error.errors).forEach(k => console.error(" -", k, ":", error.errors[k].message));
        }
        process.exit(1);
    }
}

insertPratikBiswas();
