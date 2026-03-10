
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        const mongoUri = process.env.MONGO_URL;
        if (!mongoUri) {
            console.error("❌ MONGO_URL not found in .env");
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        const db = mongoose.connection;

        // IDs from previous search
        const courseId = new mongoose.Types.ObjectId('698ecc6ecc716f7a61ea3a67');
        const classId = new mongoose.Types.ObjectId('6970866aabb4820c05aeca29');
        const deptId = new mongoose.Types.ObjectId('697086a2abb4820c05aeca52');
        const examTagId = new mongoose.Types.ObjectId('6970868eabb4820c05aeca3f');

        // Find an admin user for createdBy
        const adminUser = await db.collection("users").findOne({ role: "SuperAdmin" });
        const creatorId = adminUser ? adminUser._id : null;

        const studentName = "RUDRA SARKAR";
        const email = "rs43211@gmail.com";
        const mobile = "9733352298";
        const admissionNumber = "PATH25023108";
        const totalFees = 26000;
        const paidAmount = 8000;
        const session = "2026-2027";
        const centre = "Outstation";

        // 1. Insert Student
        const studentDoc = {
            studentsDetails: [{
                studentName: studentName,
                centre: centre,
                mobileNum: mobile,
                whatsappNumber: mobile,
                studentEmail: email,
                dateOfBirth: "2010-01-01", // Placeholder
            }],
            guardians: [],
            examSchema: [],
            section: [],
            sessionExamCourse: [{
                session: session,
                examTag: "",
                targetExams: "Foundation Class VII",
            }],
            batches: [],
            course: courseId,
            isEnrolled: true,
            status: "Active",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const studentResult = await db.collection("students").insertOne(studentDoc);
        const studentId = studentResult.insertedId;
        console.log("✅ Student inserted:", studentId);

        // 2. Insert Admission
        const baseFees = totalFees / 1.18;
        const cgst = (totalFees / 1.18) * 0.09;
        const sgst = (totalFees / 1.18) * 0.09;

        const admissionDoc = {
            student: studentId,
            admissionType: "NORMAL",
            course: courseId,
            class: classId,
            examTag: examTagId,
            department: deptId,
            centre: centre,
            admissionDate: new Date(),
            admissionNumber: admissionNumber,
            academicSession: session,
            totalFees: totalFees,
            baseFees: baseFees,
            cgstAmount: cgst,
            sgstAmount: sgst,
            downPayment: paidAmount,
            downPaymentStatus: "PAID",
            downPaymentReceivedDate: new Date(),
            downPaymentMethod: "CASH",
            remainingAmount: totalFees - paidAmount,
            totalPaidAmount: paidAmount,
            paymentStatus: "PARTIAL",
            numberOfInstallments: 1,
            installmentAmount: totalFees - paidAmount,
            paymentBreakdown: [
                {
                    installmentNumber: 1,
                    dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                    amount: totalFees - paidAmount,
                    status: "PENDING"
                }
            ],
            admissionStatus: "ACTIVE",
            createdBy: creatorId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const admissionResult = await db.collection("admissions").insertOne(admissionDoc);
        const admissionId = admissionResult.insertedId;
        console.log("✅ Admission inserted:", admissionId);

        // 3. Insert Payment record for the down payment
        const paymentDoc = {
            admission: admissionId,
            installmentNumber: 0,
            amount: paidAmount,
            paidAmount: paidAmount,
            dueDate: new Date(),
            paidDate: new Date(),
            receivedDate: new Date(),
            status: "PAID",
            paymentMethod: "CASH",
            billId: `DP-${admissionNumber}-${Date.now()}`,
            recordedBy: creatorId,
            totalAmount: paidAmount,
            courseFee: paidAmount / 1.18,
            cgst: (paidAmount / 1.18) * 0.09,
            sgst: (paidAmount / 1.18) * 0.09,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const paymentResult = await db.collection("payments").insertOne(paymentDoc);
        console.log("✅ Payment inserted:", paymentResult.insertedId);

        console.log("\n🚀 All records inserted successfully for RUDRA SARKAR");

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

run();
