import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import Payment from './models/Payment/Payment.js';
import User from './models/User.js';

dotenv.config();

const filePath = 'c:\\Users\\MALAY\\erp_1\\exports_data\\NOT UPLOAD IN NEW ERP FOR MIDNAPORE CENTRE.xlsx';

const courseMapping = {
    "Foundation Class VIII (Out-station) 2026-2027": "698ecc71cc716f7a61ea3abb",
    "Foundation Outstation Class (VIII+IX+X) 3Years 2026-2029": "699d5d42055288fa857c84b1",
    "FOUNDATION CLASS X Online 2026-2027": "6971d4707b7d1cb9d0af9e97",
    "Foundation Class X (Outstation) 2026-2027": "698ecc7dcc716f7a61ea3bfa"
};

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && dateStr.includes('.')) {
        const [d, m, y] = dateStr.split('.').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
}

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const adminUser = await User.findOne({ role: 'superAdmin' }) || await User.findOne();
        if (!adminUser) throw new Error("No user found in database to assign as creator");

        for (const row of data) {
            const enrollNo = row['Enroll No'];
            console.log(`\n--- Processing: ${row['Student Name']} (${enrollNo}) ---`);

            // Check if admission already exists
            const existingAdmission = await Admission.findOne({ admissionNumber: enrollNo });
            if (existingAdmission) {
                console.log(`Skipping: Admission ${enrollNo} already exists.`);
                continue;
            }

            const courseId = courseMapping[row['Course Name']];
            if (!courseId) {
                console.error(`Course ID not found for: ${row['Course Name']}`);
                continue;
            }

            const course = await Course.findById(courseId);
            if (!course) {
                console.error(`Course document not found for ID: ${courseId}`);
                continue;
            }

            // 1. Create Student
            const studentData = {
                studentsDetails: [{
                    studentName: row['Student Name'],
                    dateOfBirth: row['dob'],
                    gender: row['Gender'],
                    centre: row['Centre'],
                    board: row['Board'] || "WB",
                    studentEmail: row['email'] === "NIL" ? "" : row['email'],
                    mobileNum: String(row['Phone']).substring(0, 10),
                    whatsappNumber: String(row['Phone']).substring(0, 10),
                    schoolName: row['School'],
                    pincode: String(row['Pincode'] || ""),
                    programme: course.programme || "CRP"
                }],
                guardians: [{
                    guardianName: row['Guardians Name'],
                    guardianMobile: String(row['Guardians Mobile Number'] || "").substring(0, 10),
                    guardianEmail: row['Guardians Email Address'] === row['Guardians Mobile Number'] ? "" : row['Guardians Email Address'],
                    occupation: row['Guardians Occupation'],
                    qualification: row['Guardians Qualification']
                }],
                course: course._id,
                department: course.department,
                isEnrolled: true,
                status: 'Active',
                counselledBy: row['Admitted By']
            };

            const student = new Student(studentData);
            await student.save();

            // 2. Create Admission
            const userBaseFee = Number(row['Commited Amount']);
            const userGst = userBaseFee * 0.18;
            const userTotalFees = userBaseFee + userGst;

            const downPayment = Number(row['Admission Amount']);
            const totalPaid = Number(row['Total Amount Paid Till Date']);
            const remaining = userTotalFees - totalPaid;

            const admissionData = {
                student: student._id,
                admissionType: "NORMAL",
                course: course._id,
                class: course.class,
                examTag: course.examTag,
                department: course.department,
                centre: row['Centre'],
                admissionNumber: enrollNo,
                admissionDate: parseDate(row['Admission Date']),
                academicSession: row['Session'] || "2026-2027",
                baseFees: userBaseFee,
                cgstAmount: userGst / 2,
                sgstAmount: userGst / 2,
                totalFees: userTotalFees,
                downPayment: downPayment,
                remainingAmount: remaining,
                numberOfInstallments: 5,
                installmentAmount: Math.ceil(remaining / 5),
                paymentStatus: (totalPaid >= userTotalFees) ? "COMPLETED" : "PARTIAL",
                totalPaidAmount: totalPaid,
                remarks: `Imported from Excel - Midnapore. Admitted by ${row['Admitted By']}`,
                createdBy: adminUser._id,
                feeStructureSnapshot: course.feesStructure
            };

            const admission = new Admission(admissionData);
            await admission.save();

            // 3. Create Payment for initial amount
            if (totalPaid > 0) {
                const payment = new Payment({
                    admission: admission._id,
                    installmentNumber: 0,
                    amount: totalPaid,
                    paidAmount: totalPaid,
                    dueDate: admissionData.admissionDate,
                    paidDate: admissionData.admissionDate,
                    status: "PAID",
                    paymentMethod: "CASH",
                    remarks: "Initial Payment Import",
                    recordedBy: adminUser._id,
                    cgst: (totalPaid * 0.18 / 1.18) / 2,
                    sgst: (totalPaid * 0.18 / 1.18) / 2,
                    totalAmount: totalPaid
                });
                await payment.save();
                console.log(`Payment of ₹${totalPaid} recorded.`);
            }

            console.log(`Successfully registered: ${row['Student Name']} with ${enrollNo}`);
        }

        console.log("\nMigration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
