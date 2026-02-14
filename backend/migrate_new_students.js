import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import { parse, isValid } from 'date-fns';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import Centre from './models/Master_data/Centre.js';
import Session from './models/Master_data/Session.js';
import Payment from './models/Payment/Payment.js';
import Department from './models/Master_data/Department.js';
import ExamTag from './models/Master_data/ExamTag.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const parseExcelDate = (val) => {
    if (!val) return new Date();
    if (typeof val === 'number') {
        // Excel serial date to JS Date
        return new Date((val - 25569) * 86400 * 1000);
    }
    if (typeof val === 'string') {
        const formats = ['d/M/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'd-M-yyyy', 'dd-MM-yyyy', 'dd/MM/yyyy'];
        for (const fmt of formats) {
            try {
                const parsed = parse(val.trim(), fmt, new Date());
                if (isValid(parsed)) return parsed;
            } catch (e) { }
        }
    }
    const d = new Date(val);
    return isValid(d) ? d : new Date();
};

const padPhone = (phone) => {
    const s = String(phone || '').replace(/\D/g, '');
    return s.padStart(10, '0').slice(-10);
};

const files = [
    'c:/Users/USER/erp_1/exports_data/student_data.xlsx',
    'c:/Users/USER/erp_1/exports_data/student_data_2627.xlsx'
];

async function migrate() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to MongoDB");

        // --- Configuration ---
        const clearExisting = false; // SAFETY: Set to false to prevent data loss
        if (clearExisting) {
            console.log("⚠️  WARNING: This would clear existing data. Skipping for safety.");
            // await Student.deleteMany({});
            // await Admission.deleteMany({});
            // await Payment.deleteMany({});
        }

        // --- Pre-fetch Master Data for Mapping ---
        const centres = await Centre.find({});
        const sessions = await Session.find({});
        const departments = await Department.find({});
        const examTags = await ExamTag.find({});

        const defaultDept = departments[0];
        const defaultExamTag = examTags[0];

        console.log(`📊 Loaded ${centres.length} centres, ${sessions.length} sessions, ${departments.length} departments`);

        const getCentreId = (name) => {
            if (!name || typeof name !== 'string') return "HAZRA H.O"; // Default fallback
            const found = centres.find(c => c.centreName && c.centreName.toLowerCase() === name.trim().toLowerCase());
            return found ? found.centreName : "HAZRA H.O";
        };

        const getOrCreateSession = async (name) => {
            if (!name || typeof name !== 'string') return "2024-2025"; // Fallback
            let found = sessions.find(s => s.sessionName && s.sessionName.toLowerCase() === name.trim().toLowerCase());
            if (!found) {
                console.log(`🆕 Creating new session: ${name}`);
                found = await Session.create({ sessionName: name.trim() });
                sessions.push(found);
            }
            return found.sessionName;
        };

        const getOrCreateCourse = async (courseName, sessionName) => {
            if (!courseName || typeof courseName !== 'string') return null;
            let found = await Course.findOne({ courseName: courseName.trim() });
            if (!found) {
                console.log(`🆕 Creating new course: ${courseName}`);
                const isOnline = courseName.toLowerCase().includes('online');
                const isInstation = courseName.toLowerCase().includes('institution') || courseName.toLowerCase().includes('instation');

                found = await Course.create({
                    courseName: courseName.trim(),
                    department: defaultDept?._id,
                    examTag: [defaultExamTag?._id],
                    courseDuration: "1 Year", // Default
                    coursePeriod: "Yearly", // Default
                    courseSession: sessionName || "2024-2025",
                    feesStructure: [], // Required
                    mode: isOnline ? 'ONLINE' : 'OFFLINE',
                    courseType: isInstation ? 'INSTATION' : 'OUTSTATION',
                    status: 'Active',
                    baseFees: 0,
                    gstPercentage: 18
                });
            }
            return found;
        };

        const extractSession = (courseName) => {
            if (!courseName || typeof courseName !== 'string') return null;
            const match = courseName.match(/\d{4}-\d{2,4}/);
            return match ? match[0] : null;
        };

        let totalImported = 0;
        let totalErrors = 0;
        let totalSkipped = 0;
        const errorDetails = [];

        for (const file of files) {
            console.log(`\n📁 Processing file: ${path.basename(file)}`);
            const workbook = XLSX.readFile(file);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            console.log(`   Found ${rows.length} rows in file`);

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    // Skip empty rows or rows without Enrollment No
                    if (!row['Enroll No'] || !row['Student Name']) {
                        totalSkipped++;
                        continue;
                    }

                    // *** FILTER FOR TARGET SESSIONS ***
                    const targetSessions = ["2025-2027", "2026-2027"];
                    const rowSession = row['Session'] ? row['Session'].trim() : null;

                    if (!targetSessions.includes(rowSession)) {
                        // Skip rows not in target sessions
                        continue;
                    }

                    // *** CHECK FOR EXISTING ADMISSION ***
                    const existingAdmission = await Admission.findOne({ admissionNumber: row['Enroll No'] });
                    if (existingAdmission) {
                        console.log(`   ⏭️  Skipping existing student: ${row['Enroll No']} - ${row['Student Name']}`);
                        totalSkipped++;
                        continue;
                    }

                    // 1. Resolve Session & Course
                    const rawSession = row['Session'] || extractSession(row['Course Name']);
                    const sessionName = await getOrCreateSession(rawSession);
                    const course = await getOrCreateCourse(row['Course Name'], sessionName);

                    if (!course) {
                        throw new Error(`Could not create/find course: ${row['Course Name']}`);
                    }

                    // 2. Map Student Details
                    const fullName = String(row['Student Name'] || "Unknown Student").trim();

                    const studentData = {
                        studentsDetails: [{
                            studentName: fullName,
                            mobileNum: padPhone(row['Phone']),
                            whatsappNumber: padPhone(row['Phone']),
                            studentEmail: row['email'] || `${row['Enroll No']}@placeholder.com`,
                            gender: row['Gender'] || "Male",
                            dateOfBirth: parseExcelDate(row['dob']),
                            centre: getCentreId(row['Centre']),
                            board: row['Board'] || "WB",
                            schoolName: row['School'] || "N/A",
                            pincode: row['Pincode'],
                            address: row['Address'] || ""
                        }],
                        guardians: [{
                            guardianName: row['Guardians Name'],
                            guardianMobile: padPhone(row['Guardians Mobile Number']),
                            guardianEmail: row['Guardians Email Address'],
                            occupation: row['Guardians Occupation']
                        }],
                        isEnrolled: true,
                        course: course?._id,
                        department: defaultDept?._id
                    };

                    const student = await Student.create(studentData);

                    // 3. Map Admission Details
                    const totalFees = parseFloat(row['Commited Amount'] || 0);
                    const totalPaid = parseFloat(row['Total Amount Paid Till Date'] || 0);
                    const downPayment = parseFloat(row['Admission Amount'] || 0);
                    const remaining = Math.max(0, totalFees - totalPaid);

                    const parsedDate = parseExcelDate(row['Admission Date']);

                    const admission = new Admission({
                        student: student._id,
                        admissionType: "NORMAL",
                        course: course?._id,
                        academicSession: sessionName,
                        department: defaultDept?._id,
                        examTag: defaultExamTag?._id,
                        centre: studentData.studentsDetails[0].centre,
                        admissionDate: parsedDate,
                        admissionNumber: row['Enroll No'],
                        totalFees: totalFees,
                        baseFees: totalFees / 1.18,
                        cgstAmount: (totalFees / 1.18) * 0.09,
                        sgstAmount: (totalFees / 1.18) * 0.09,
                        downPayment: downPayment,
                        downPaymentStatus: downPayment > 0 ? "PAID" : "PENDING",
                        downPaymentReceivedDate: downPayment > 0 ? parsedDate : null,
                        remainingAmount: remaining,
                        totalPaidAmount: totalPaid,
                        paymentStatus: totalPaid >= totalFees ? "COMPLETED" : (totalPaid > 0 ? "PARTIAL" : "PENDING"),
                        numberOfInstallments: 1,
                        installmentAmount: parseFloat(row['Installment Amount'] || remaining),
                        paymentBreakdown: []
                    });

                    // Create Payment Breakdown
                    if (totalPaid > downPayment) {
                        admission.paymentBreakdown.push({
                            installmentNumber: 1,
                            dueDate: parsedDate,
                            amount: totalPaid - downPayment,
                            paidAmount: totalPaid - downPayment,
                            status: "PAID",
                            paidDate: parsedDate,
                            receivedDate: parsedDate,
                            paymentMethod: "CASH"
                        });
                    }
                    if (remaining > 0) {
                        admission.paymentBreakdown.push({
                            installmentNumber: (totalPaid > downPayment ? 2 : 1),
                            dueDate: new Date(parsedDate.getTime() + 30 * 24 * 60 * 60 * 1000),
                            amount: remaining,
                            status: "PENDING"
                        });
                    }

                    await admission.save();

                    // 4. Create Payment records for Analytics
                    if (downPayment > 0) {
                        await Payment.create({
                            admission: admission._id,
                            installmentNumber: 0,
                            amount: downPayment,
                            paidAmount: downPayment,
                            dueDate: parsedDate,
                            paidDate: parsedDate,
                            receivedDate: parsedDate,
                            status: "PAID",
                            paymentMethod: "CASH",
                            billId: `MIG-DP-${admission.admissionNumber}`,
                            totalAmount: downPayment
                        });
                    }
                    if (totalPaid > downPayment) {
                        await Payment.create({
                            admission: admission._id,
                            installmentNumber: 1,
                            amount: totalPaid - downPayment,
                            paidAmount: totalPaid - downPayment,
                            dueDate: parsedDate,
                            paidDate: parsedDate,
                            receivedDate: parsedDate,
                            status: "PAID",
                            paymentMethod: "CASH",
                            billId: `MIG-INS-${admission.admissionNumber}`,
                            totalAmount: totalPaid - downPayment
                        });
                    }

                    totalImported++;
                    if (totalImported % 50 === 0) {
                        console.log(`   ✅ Imported ${totalImported} students...`);
                    }

                } catch (err) {
                    const errorMsg = `Row ${i + 2} (${row['Enroll No']} - ${row['Student Name']}): ${err.message}`;
                    console.error(`   ❌ ${errorMsg}`);
                    errorDetails.push(errorMsg);
                    totalErrors++;
                }
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 MIGRATION SUMMARY`);
        console.log(`${'='.repeat(60)}`);
        console.log(`✅ Successfully imported: ${totalImported} students`);
        console.log(`⏭️  Skipped (existing/empty): ${totalSkipped} records`);
        console.log(`❌ Errors encountered: ${totalErrors}`);

        if (errorDetails.length > 0) {
            console.log(`\n⚠️  ERROR DETAILS:`);
            errorDetails.forEach((err, idx) => {
                console.log(`   ${idx + 1}. ${err}`);
            });
        }

        console.log(`${'='.repeat(60)}\n`);

    } catch (error) {
        console.error("💥 Critical Migration Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
}

migrate();
