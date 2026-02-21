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
    if (typeof val === 'string' && val.trim()) {
        const formats = ['d/M/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'd-M-yyyy', 'dd-MM-yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd HH:mm:ss'];
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
    if (!s) return "0000000000";
    return s.padStart(10, '0').slice(-10);
};

const file = 'c:/Users/USER/erp_1/exports_data/abc.xlsx';

async function migrate() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        // --- Pre-fetch Master Data ---
        const centres = await Centre.find({});
        const sessions = await Session.find({});
        const departments = await Department.find({});
        const examTags = await ExamTag.find({});

        const defaultDept = departments.find(d => d.departmentName.includes('CRP')) || departments[0];
        const defaultExamTag = examTags[0];

        const getCentreId = (name) => {
            if (!name || typeof name !== 'string') return "HAZRA H.O";
            const found = centres.find(c => c.centreName && c.centreName.toLowerCase().trim() === name.trim().toLowerCase());
            return found ? found.centreName : "HAZRA H.O";
        };

        const getOrCreateSession = async (name) => {
            if (!name) return "2024-2025";
            let sName = String(name).trim();
            let found = sessions.find(s => s.sessionName && s.sessionName.toLowerCase() === sName.toLowerCase());
            if (!found) {
                console.log(`Creating new session: ${sName}`);
                found = await Session.create({ sessionName: sName });
                sessions.push(found);
            }
            return found.sessionName;
        };

        const getOrCreateCourse = async (courseName, sessionName) => {
            if (!courseName) return null;
            let cName = String(courseName).trim();
            let found = await Course.findOne({ courseName: cName });
            if (!found) {
                console.log(`Creating new course: ${cName}`);
                const isOnline = cName.toLowerCase().includes('online');
                const isInstation = cName.toLowerCase().includes('institution') || cName.toLowerCase().includes('instation');

                found = await Course.create({
                    courseName: cName,
                    department: defaultDept?._id,
                    examTag: [defaultExamTag?._id],
                    courseDuration: "1 Year",
                    coursePeriod: "Yearly",
                    courseSession: sessionName || "2024-2025",
                    feesStructure: [],
                    mode: isOnline ? 'ONLINE' : 'OFFLINE',
                    courseType: isInstation ? 'INSTATION' : 'OUTSTATION',
                    status: 'Active',
                    baseFees: 0,
                    gstPercentage: 18
                });
            }
            return found;
        };

        console.log(`Reading file: ${path.basename(file)}`);
        const workbook = XLSX.readFile(file);
        const sheet = workbook.Sheets['data (2)'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const rows = data.slice(4091); // Process all remaining students from second sheet
        console.log(`Found ${data.length - 1} total rows in 'data (2)'. Processing all remaining records from index 4091...`);

        let totalImported = 0;
        let totalErrors = 0;
        let totalSkipped = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                // Column Mapping based on check_excel_headers.js
                // 1: Date, 2: Enroll No, 3: Phone, 4: Email, 5: DOB, 6: Name, 
                // 12: Total Fees (Gross), 13: DP (Gross), 14: Installment (Gross), 15: Paid (Gross)
                // 17: Course, 18: Session, 19: Centre, 21: Gender, 22: Board, 23: School, 24: Pincode
                // 25: G-Email, 26: G-Phone, 27: G-Name, 28: G-Occupation, 29: G-Qual

                const enrollNo = String(row[2] || "").trim();
                const studentName = String(row[6] || "").trim();
                const rawCourseName = String(row[17] || "").trim();
                const rawSessionName = String(row[18] || "").trim();

                if (!enrollNo || !studentName) {
                    totalSkipped++;
                    continue;
                }

                const sessionName = await getOrCreateSession(rawSessionName);
                const course = await getOrCreateCourse(rawCourseName, sessionName);

                // --- DUPLICATE CHECK ---
                // "if students have already same course with same sessions, and with same enrollment id, then skip it"
                const existingAdms = await Admission.find({ admissionNumber: enrollNo });
                let studentId = null;
                let skipRow = false;

                if (existingAdms.length > 0) {
                    studentId = existingAdms[0].student; // Link to existing student

                    const duplicate = existingAdms.find(a =>
                        a.academicSession === sessionName &&
                        a.course.toString() === course?._id?.toString()
                    );

                    if (duplicate) {
                        // console.log(`Skipping duplicate admission: ${enrollNo} | ${rawCourseName} | ${sessionName}`);
                        totalSkipped++;
                        skipRow = true;
                    }
                }

                if (skipRow) continue;

                // --- PREPARE DATA ---
                const admissionDate = parseExcelDate(row[1]);
                const dob = parseExcelDate(row[5]);
                const totalFees = parseFloat(row[12] || 0);
                const totalPaid = parseFloat(row[15] || 0);
                const downPayment = parseFloat(row[13] || 0);
                const remaining = Math.max(0, totalFees - totalPaid);

                // 2. Map Student Details (if not reusing)
                if (!studentId) {
                    const studentData = {
                        studentsDetails: [{
                            studentName: studentName,
                            mobileNum: padPhone(row[3]),
                            whatsappNumber: padPhone(row[3]),
                            studentEmail: row[4] || `${enrollNo}@placeholder.com`,
                            gender: row[21] || "Male",
                            dateOfBirth: dob.toISOString().split('T')[0], // Student model expects string for DOB in some schemas, but let's be safe
                            centre: getCentreId(row[19]),
                            board: row[22] || "WB",
                            schoolName: row[23] || "N/A",
                            pincode: String(row[24] || ""),
                            address: ""
                        }],
                        guardians: [{
                            guardianName: row[27],
                            guardianMobile: padPhone(row[26]),
                            guardianEmail: row[25],
                            occupation: row[28],
                            qualification: row[29]
                        }],
                        isEnrolled: true,
                        course: course?._id,
                        department: defaultDept?._id,
                        counselledBy: row[20] || "Imported"
                    };
                    const student = await Student.create(studentData);
                    studentId = student._id;
                }

                // 3. Create Admission
                const admission = new Admission({
                    student: studentId,
                    admissionType: "NORMAL",
                    course: course?._id,
                    academicSession: sessionName,
                    department: defaultDept?._id,
                    examTag: defaultExamTag?._id,
                    centre: getCentreId(row[19]),
                    admissionDate: admissionDate,
                    admissionNumber: enrollNo,
                    totalFees: totalFees,
                    baseFees: totalFees / 1.18,
                    cgstAmount: (totalFees / 1.18) * 0.09,
                    sgstAmount: (totalFees / 1.18) * 0.09,
                    downPayment: downPayment,
                    downPaymentStatus: downPayment > 0 ? "PAID" : "PENDING",
                    remainingAmount: remaining,
                    totalPaidAmount: totalPaid,
                    paymentStatus: totalPaid >= totalFees ? "COMPLETED" : (totalPaid > 0 ? "PARTIAL" : "PENDING"),
                    numberOfInstallments: 1,
                    installmentAmount: parseFloat(row[14] || remaining),
                    paymentBreakdown: []
                });

                // Payment Breakdown logic
                if (totalPaid > downPayment) {
                    admission.paymentBreakdown.push({
                        installmentNumber: 1,
                        dueDate: admissionDate,
                        amount: totalPaid - downPayment,
                        paidAmount: totalPaid - downPayment,
                        status: "PAID",
                        paidDate: admissionDate,
                        paymentMethod: "CASH"
                    });
                }
                if (remaining > 0) {
                    admission.paymentBreakdown.push({
                        installmentNumber: (totalPaid > downPayment ? 2 : 1),
                        dueDate: new Date(admissionDate.getTime() + 30 * 24 * 60 * 60 * 1000),
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
                        dueDate: admissionDate,
                        paidDate: admissionDate,
                        receivedDate: admissionDate,
                        status: "PAID",
                        paymentMethod: "CASH",
                        billId: `MIG2-DP-${admission.admissionNumber}-${Date.now()}-${totalImported}`,
                        totalAmount: downPayment
                    });
                }
                if (totalPaid > downPayment) {
                    await Payment.create({
                        admission: admission._id,
                        installmentNumber: 1,
                        amount: totalPaid - downPayment,
                        paidAmount: totalPaid - downPayment,
                        dueDate: admissionDate,
                        paidDate: admissionDate,
                        receivedDate: admissionDate,
                        status: "PAID",
                        paymentMethod: "CASH",
                        billId: `MIG2-INS-${admission.admissionNumber}-${Date.now()}-${totalImported}`,
                        totalAmount: totalPaid - downPayment
                    });
                }

                totalImported++;
                if (totalImported % 100 === 0) console.log(`Imported ${totalImported} admissions...`);

            } catch (err) {
                console.error(`Error at index ${i + 2}:`, err.message);
                totalErrors++;
            }
        }

        console.log(`\nMigration completed!`);
        console.log(`Successfully imported: ${totalImported}`);
        console.log(`Errors encountered: ${totalErrors}`);
        console.log(`Skipped: ${totalSkipped}`);

    } catch (error) {
        console.error("Critical Migration Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
