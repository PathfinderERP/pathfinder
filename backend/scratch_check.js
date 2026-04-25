
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Students.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Payment from './models/Payment/Payment.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function checkStudents() {
    try {
        if (!MONGO_URI) {
            console.error("MONGO_URL not found in .env");
            process.exit(1);
        }

        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const targetIds = ["PATH26002639", "PATH26002638", "PATH26002636"];
        
        console.log("Searching BoardCourseAdmission by admissionNumber...");
        const admissions = await BoardCourseAdmission.find({
            admissionNumber: { $in: targetIds }
        }).lean();

        console.log(`Found ${admissions.length} admissions.`);

        for (const adm of admissions) {
            console.log(`\n--- Admission: ${adm.admissionNumber} (ID: ${adm._id}) ---`);
            console.log(`    Programme: ${adm.programme}`);
            console.log(`    Admission Fee: ${adm.admissionFee}`);
            console.log(`    Exam Fee: ${adm.examFee}, Paid: ${adm.examFeePaid}`);
            console.log(`    Additional: ${adm.additionalThingsAmount}, Paid: ${adm.additionalThingsPaid}`);
            console.log(`    Total Expected: ${adm.totalExpectedAmount}`);
            console.log(`    Total Paid: ${adm.totalPaidAmount}`);
            
            // Check Installments
            if (adm.installments && adm.installments.length > 0) {
                const first = adm.installments[0];
                console.log(`    First Installment: Payable=${first.payableAmount}, Paid=${first.paidAmount}, Status=${first.status}`);
            }

            // Check Payments
            const payments = await Payment.find({ 
                admission: adm._id 
            }).lean();
            
            console.log(`    Payments found: ${payments.length}`);
            for (const p of payments) {
                console.log(`      Payment ID: ${p._id}, Bill ID: ${p.billId || 'MISSING'}, Amount: ${p.amount}, PaidAmount: ${p.paidAmount}, Status: ${p.status}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkStudents();
