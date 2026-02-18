import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import { parse, isValid } from 'date-fns';
import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';
import Course from '../models/Master_data/Courses.js';
import Centre from '../models/Master_data/Centre.js';
import Session from '../models/Master_data/Session.js';
import Payment from '../models/Payment/Payment.js';
import Department from '../models/Master_data/Department.js';
import ExamTag from '../models/Master_data/ExamTag.js';
import User from '../models/User.js';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const MONGO_URL = process.env.MONGO_URL;
const SUPER_ADMIN_ID = '6970c4129590082b81674b65'; // superAdmin ID retrieved from DB

const parseExcelDate = (val) => {
    if (!val) return new Date();
    if (typeof val === 'number') {
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

async function migrate() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to MongoDB");

        const dryRun = process.argv.includes('--dry-run');
        if (dryRun) console.log("🧪 DRY RUN ENABLED - No changes will be saved to the database.");

        const filePath = 'd:\\pathfinder\\exports_data\\student_data (2).xlsx';
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const start = 7000;
        const limit = 2000;
        const rowsToProcess = rows.slice(start, start + limit);
        console.log(`📊 Processing ${rowsToProcess.length} rows (starting from row ${start + 1}) from ${filePath}`);

        // Pre-fetch Master Data
        const centres = await Centre.find({});
        const sessions = await Session.find({});
        const departments = await Department.find({});
        const examTags = await ExamTag.find({});

        const defaultDept = departments[0];
        const defaultExamTag = examTags[0];

        const getCentreId = (name) => {
            if (!name || typeof name !== 'string') return "HAZRA H.O";
            const found = centres.find(c => c.centreName && c.centreName.toLowerCase() === name.trim().toLowerCase());
            return found ? found.centreName : "HAZRA H.O";
        };

        const getOrCreateSession = async (name) => {
            if (!name) return "2024-2025";
            name = String(name).trim();
            let found = sessions.find(s => s.sessionName && s.sessionName.toLowerCase() === name.toLowerCase());
            if (!found) {
                if (!dryRun) {
                    console.log(`🆕 Creating new session: ${name}`);
                    found = await Session.create({ sessionName: name });
                    sessions.push(found);
                } else {
                    return name;
                }
            }
            return found.sessionName;
        };

        const getOrCreateCourse = async (courseName, sessionName) => {
            if (!courseName) return null;
            courseName = String(courseName).trim();
            let found = await Course.findOne({ courseName: courseName });
            if (!found) {
                if (!dryRun) {
                    console.log(`🆕 Creating new course: ${courseName}`);
                    const isOnline = courseName.toLowerCase().includes('online');
                    const isInstation = courseName.toLowerCase().includes('institution') || courseName.toLowerCase().includes('instation');

                    found = await Course.create({
                        courseName: courseName,
                        department: defaultDept?._id,
                        examTag: defaultExamTag?._id,
                        courseDuration: "1 Year",
                        coursePeriod: "Yearly",
                        courseSession: sessionName || "2024-2025",
                        feesStructure: [],
                        mode: isOnline ? 'ONLINE' : 'OFFLINE',
                        courseType: isInstation ? 'INSTATION' : 'OUTSTATION',
                        status: 'Active'
                    });
                } else {
                    return { _id: new mongoose.Types.ObjectId(), courseName };
                }
            }
            return found;
        };

        let stats = { imported: 0, newCourse: 0, skipped: 0, errors: 0 };

        for (let i = 0; i < rowsToProcess.length; i++) {
            const row = rowsToProcess[i];
            const enrollNo = row['Enroll No'];
            const studentName = row['Student Name'];

            if (!enrollNo || !studentName) {
                stats.skipped++;
                continue;
            }

            try {
                // Check if Admission exists
                const existingAdmissions = await Admission.find({ admissionNumber: enrollNo });
                
                const sessionName = await getOrCreateSession(row['Session']);
                const course = await getOrCreateCourse(row['Course Name'], sessionName);

                if (existingAdmissions.length > 0) {
                    // Check if student already has THIS course and session
                    const duplicate = existingAdmissions.find(a => 
                        a.academicSession === sessionName && 
                        String(a.course) === String(course?._id)
                    );

                    if (duplicate) {
                        console.log(`⏭️  Skipping duplicate admission: ${enrollNo} - ${row['Course Name']} (${sessionName})`);
                        stats.skipped++;
                        continue;
                    }

                    // Student exists but enrolling in a different course/session
                    console.log(`➕ Adding new course for existing student: ${enrollNo} - ${row['Course Name']}`);
                    const studentId = existingAdmissions[0].student;
                    
                    await createAdmissionRecord(row, studentId, course, sessionName, enrollNo, dryRun);
                    stats.newCourse++;
                } else {
                    // New Student and New Admission
                    console.log(`👤 Importing new student: ${enrollNo} - ${studentName}`);
                    
                    const studentData = {
                        studentsDetails: [{
                            studentName: studentName.trim(),
                            mobileNum: padPhone(row['Phone']),
                            whatsappNumber: padPhone(row['Phone']),
                            studentEmail: row['email'],
                            gender: row['Gender'] || "Male",
                            dateOfBirth: parseExcelDate(row['dob']),
                            centre: getCentreId(row['Centre']),
                            board: row['Board'] || "WB",
                            schoolName: row['School'] || "N/A",
                            pincode: String(row['Pincode'] || ""),
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

                    let student;
                    if (!dryRun) {
                        student = await Student.create(studentData);
                    } else {
                        student = { _id: new mongoose.Types.ObjectId() };
                    }

                    await createAdmissionRecord(row, student._id, course, sessionName, enrollNo, dryRun);
                    stats.imported++;
                }

                if ((stats.imported + stats.newCourse) % 50 === 0) {
                    console.log(`✅ Progress: ${stats.imported + stats.newCourse} processed...`);
                }

            } catch (err) {
                console.error(`❌ Error at row ${i + 2} (${enrollNo}):`, err.message);
                stats.errors++;
            }
        }

        console.log(`\nMigration completed!`);
        console.log(`Imported New Students: ${stats.imported}`);
        console.log(`Added New Courses: ${stats.newCourse}`);
        console.log(`Skipped: ${stats.skipped}`);
        console.log(`Errors: ${stats.errors}`);

    } catch (error) {
        console.error("💥 Critical Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

async function createAdmissionRecord(row, studentId, course, sessionName, enrollNo, dryRun) {
    const totalFees = parseFloat(row['Commited Amount_1'] || 0);
    const downPayment = parseFloat(row['Admission Amount_1'] || 0);
    const totalPaid = parseFloat(row['Total Amount Paid Till Date_1'] || 0);
    
    // Back-calculate GST
    const baseFees = totalFees / 1.18;
    const gstTotal = totalFees - baseFees;
    const cgst = gstTotal / 2;
    const sgst = gstTotal / 2;

    const remaining = Math.max(0, totalFees - totalPaid);
    const parsedDate = parseExcelDate(row['Admission Date']);

    const admissionData = {
        student: studentId,
        admissionType: "NORMAL",
        course: course?._id,
        academicSession: sessionName,
        department: course?.department || undefined,
        examTag: course?.examTag || undefined,
        centre: row['Centre'] ? String(row['Centre']).trim() : "HAZRA H.O",
        admissionDate: parsedDate,
        admissionNumber: enrollNo,
        totalFees: totalFees,
        baseFees: baseFees,
        cgstAmount: cgst,
        sgstAmount: sgst,
        downPayment: downPayment,
        downPaymentStatus: downPayment > 0 ? "PAID" : "PENDING",
        downPaymentReceivedDate: downPayment > 0 ? parsedDate : null,
        remainingAmount: remaining,
        totalPaidAmount: totalPaid,
        paymentStatus: totalPaid >= totalFees ? "COMPLETED" : (totalPaid > 0 ? "PARTIAL" : "PENDING"),
        numberOfInstallments: 1,
        installmentAmount: remaining,
        paymentBreakdown: [],
        createdBy: SUPER_ADMIN_ID
    };

    if (totalPaid > downPayment) {
        admissionData.paymentBreakdown.push({
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
        admissionData.paymentBreakdown.push({
            installmentNumber: (totalPaid > downPayment ? 2 : 1),
            dueDate: new Date(parsedDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            amount: remaining,
            status: "PENDING"
        });
    }

    if (!dryRun) {
        const admission = new Admission(admissionData);
        await admission.save();

        // Create Payment records for record keeping
        if (downPayment > 0) {
            const dpBase = downPayment / 1.18;
            const dpGst = downPayment - dpBase;
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
                billId: `MIG-DP-${enrollNo}`,
                totalAmount: downPayment,
                cgst: dpGst / 2,
                sgst: dpGst / 2,
                courseFee: dpBase,
                recordedBy: SUPER_ADMIN_ID
            });
        }
        if (totalPaid > downPayment) {
            const instAmount = totalPaid - downPayment;
            const instBase = instAmount / 1.18;
            const instGst = instAmount - instBase;
            await Payment.create({
                admission: admission._id,
                installmentNumber: 1,
                amount: instAmount,
                paidAmount: instAmount,
                dueDate: parsedDate,
                paidDate: parsedDate,
                receivedDate: parsedDate,
                status: "PAID",
                paymentMethod: "CASH",
                billId: `MIG-INS-${enrollNo}`,
                totalAmount: instAmount,
                cgst: instGst / 2,
                sgst: instGst / 2,
                courseFee: instBase,
                recordedBy: SUPER_ADMIN_ID
            });
        }
    }
}

migrate();
