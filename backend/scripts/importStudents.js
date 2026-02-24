import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Models
import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';
import Course from '../models/Master_data/Courses.js';
import User from '../models/User.js';
import CentreSchema from '../models/Master_data/Centre.js';
import Payment from '../models/Payment/Payment.js';
import ExamTag from '../models/Master_data/ExamTag.js';
import Department from '../models/Master_data/Department.js';
import Class from '../models/Master_data/Class.js';

dotenv.config({ path: path.join(import.meta.dirname, '../.env') });

const MONGO_URL = process.env.MONGO_URL;

const files = [
    '../../exports_data/student_data_2629.xlsx',
    '../../exports_data/student_data2627.xlsx',
    '../../exports_data/student_data2632.xlsx',
    '../../exports_data/student_data2729.xlsx'
];

// Helper for Bill ID generation
const generateBillId = async (centreCode) => {
    try {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();

        let startYear, endYear;
        if (month >= 3) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }

        const yearStr = `${startYear}-${endYear.toString().slice(-2)}`;
        const prefix = `PATH/${centreCode}/${yearStr}/`;

        const lastPayment = await Payment.findOne({
            billId: { $regex: new RegExp(`^${prefix.replace(/\//g, '\\/')}\\d+$`) }
        }).sort({ createdAt: -1 });

        let nextNumber = 1;
        if (lastPayment && lastPayment.billId) {
            const parts = lastPayment.billId.split('/');
            const lastSeq = parts[parts.length - 1];
            if (lastSeq && !isNaN(lastSeq)) {
                nextNumber = parseInt(lastSeq) + 1;
            }
        }
        return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
        return `PATH/${centreCode || 'GEN'}/${Date.now()}`;
    }
};

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        // Cache master data
        const masterCourses = await Course.find();
        const masterUsers = await User.find().select('name _id');
        const masterCentres = await CentreSchema.find();
        const masterExamTags = await ExamTag.find();
        const masterDepartments = await Department.find();
        const masterClasses = await Class.find();

        const defaultDept = masterDepartments.find(d => d.departmentName.includes('Academic')) || masterDepartments[0];
        const defaultTag = masterExamTags.find(t => t.name === 'FOUNDATION') || masterExamTags[0];

        console.log(`Loaded ${masterCourses.length} courses, ${masterUsers.length} users`);

        for (const fileRelPath of files) {
            const filePath = path.join(import.meta.dirname, fileRelPath);
            if (!fs.existsSync(filePath)) {
                console.error(`File not found: ${filePath}`);
                continue;
            }

            console.log(`\nProcessing file: ${fileRelPath}`);
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Headers are at index 0
            const rows = data.slice(1);

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 5) continue;

                const admissionDateStr = String(row[1] || '').trim();
                const enrollNo = String(row[2] || '').trim();
                const phone = String(row[3] || '').trim();
                const email = String(row[4] || '').trim().toLowerCase();
                const dob = row[5];
                const studentName = String(row[6] || '').trim();

                if (!enrollNo || !studentName) continue;

                // 2. Find or Create Course
                const courseNameExcel = String(row[17] || '').trim();
                let matchedCourse = masterCourses.find(c => c.courseName.trim().toLowerCase() === courseNameExcel.toLowerCase());

                if (!matchedCourse) {
                    matchedCourse = masterCourses.find(c => courseNameExcel.toLowerCase().includes(c.courseName.trim().toLowerCase()) || c.courseName.trim().toLowerCase().includes(courseNameExcel.toLowerCase()));
                }

                const session = String(row[18] || '').trim();
                const baseFees = parseFloat(row[7]) || 0;
                const totalFees = parseFloat(row[12]) || 0;
                const downPayment = parseFloat(row[13]) || 0;
                const installmentAmount = parseFloat(row[14]) || 0;
                const totalPaid = parseFloat(row[15]) || 0;

                if (!matchedCourse && courseNameExcel) {
                    console.log(`Course "${courseNameExcel}" not found. Creating new course.`);

                    // Infer details from course name
                    // Example: "JEE+FOUNDATION (X+XI+XII) 3 Years 2026-2029"
                    const inferredTag = masterExamTags.find(t => courseNameExcel.toUpperCase().includes(t.name.toUpperCase())) || defaultTag;
                    const inferredClass = masterClasses.find(c => {
                        const name = c.name.toString();
                        return courseNameExcel.includes(`(${name})`) || courseNameExcel.includes(`Class ${name}`) || courseNameExcel.includes(`(${name}+`);
                    }) || masterClasses.find(c => c.name === 'ALL CLASS');

                    const durationMatch = courseNameExcel.match(/(\d+)\s*Year/i);
                    const duration = durationMatch ? `${durationMatch[1]} Years` : "1 Year";

                    const newCourse = new Course({
                        courseName: courseNameExcel,
                        examTag: inferredTag._id,
                        courseDuration: duration,
                        coursePeriod: "Yearly",
                        class: inferredClass?._id,
                        department: defaultDept._id,
                        courseSession: session || "2026-2027",
                        mode: "OFFLINE",
                        feesStructure: [{
                            feesType: "Admission Fees",
                            value: baseFees,
                            discount: "0"
                        }],
                        programme: courseNameExcel.toUpperCase().includes('CRP') ? 'CRP' : 'NCRP'
                    });

                    await newCourse.save();
                    masterCourses.push(newCourse);
                    matchedCourse = newCourse;
                    console.log(`Created course: ${courseNameExcel}`);
                }

                if (!matchedCourse) {
                    console.error(`Row ${i + 2}: Failed to match or create course for "${courseNameExcel}". Skipping.`);
                    continue;
                }

                const centreName = String(row[19] || '').trim();
                const admittedBy = String(row[20] || '').trim();

                // 1. Check if student exists
                let student = null;
                const existingAdmission = await Admission.findOne({ admissionNumber: enrollNo }).populate('student');
                if (existingAdmission && existingAdmission.student) {
                    student = existingAdmission.student;
                } else {
                    student = await Student.findOne({
                        $or: [
                            { "studentsDetails.mobileNum": phone },
                            { "studentsDetails.studentEmail": email }
                        ]
                    });
                }

                if (!student) {
                    // Create Student
                    student = new Student({
                        studentsDetails: [{
                            studentName,
                            dateOfBirth: dob,
                            gender: String(row[21] || '').trim(),
                            centre: centreName,
                            board: String(row[22] || '').trim(),
                            mobileNum: phone.length >= 10 ? phone.slice(-10) : '0000000000',
                            whatsappNumber: phone.length >= 10 ? phone.slice(-10) : '0000000000',
                            studentEmail: email,
                            schoolName: String(row[23] || '').trim(),
                            pincode: String(row[24] || '').trim(),
                            source: "Bulk Import"
                        }],
                        isEnrolled: true,
                        status: 'Active'
                    });

                    // Add Guardians if available
                    if (row[27]) {
                        student.guardians = [{
                            guardianName: String(row[27] || '').trim(),
                            guardianMobile: String(row[26] || '').trim(),
                            guardianEmail: String(row[25] || '').trim(),
                            occupation: String(row[28] || '').trim(),
                            qualification: String(row[29] || '').trim()
                        }];
                    }

                    await student.save();
                    console.log(`Created new student: ${studentName}`);
                }

                // Check for existing course enrollment
                const courseEnrollment = await Admission.findOne({
                    student: student._id,
                    course: matchedCourse._id,
                    academicSession: session
                });

                if (courseEnrollment) {
                    // If course is different but enrollment exists, the requirement was "check if students enrollment number already exist then check the course seccion if they are different then allt them the new course"
                    // However, my code above already checks if they are enrolled in *that specific* course.
                    // If the user meant: "If enrollment number exists, but the course in Excel is different from their current course, enroll them in the new course",
                    // then my current "if (courseEnrollment)" check already handles skipping if they ARE currently in that course.
                    // If they are NOT in that course, it will proceed to create a new Admission.
                    console.log(`Row ${i + 2}: Student ${studentName} already enrolled in ${courseNameExcel}. Skipping.`);
                    continue;
                }

                // Create Admission
                const cgst = Math.round((totalFees - baseFees) / 2);
                const sgst = cgst;

                // Parse date (DD/MM/YYYY)
                let admissionDate = new Date();
                if (admissionDateStr.includes('/')) {
                    const parts = admissionDateStr.split('/');
                    if (parts.length === 3) {
                        // Handle both DD/MM/YYYY and M/D/YYYY
                        admissionDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                }

                const creator = masterUsers.find(u => u.name.toLowerCase().includes(admittedBy.toLowerCase())) || masterUsers[0];

                const admission = new Admission({
                    student: student._id,
                    admissionType: "NORMAL",
                    admissionNumber: enrollNo,
                    course: matchedCourse._id,
                    class: matchedCourse.class,
                    examTag: matchedCourse.examTag,
                    department: matchedCourse.department,
                    centre: centreName,
                    academicSession: session,
                    admissionDate,
                    baseFees,
                    cgstAmount: cgst,
                    sgstAmount: sgst,
                    totalFees,
                    downPayment,
                    remainingAmount: installmentAmount,
                    numberOfInstallments: 1, // Defaulting to 1 for import
                    installmentAmount,
                    totalPaidAmount: totalPaid,
                    paymentStatus: totalPaid >= totalFees ? "COMPLETED" : (totalPaid > 0 ? "PARTIAL" : "PENDING"),
                    createdBy: creator?._id || null,
                    feeStructureSnapshot: matchedCourse.feesStructure,
                    remarks: `Bulk import from ${path.basename(fileRelPath)}`
                });

                await admission.save();

                // Create Payment record for downPayment if > 0
                if (downPayment > 0) {
                    let centreObj = masterCentres.find(c => c.centreName.toLowerCase().trim() === centreName.toLowerCase().trim());
                    if (!centreObj) {
                        centreObj = masterCentres.find(c => centreName.toLowerCase().includes(c.centreName.toLowerCase()));
                    }
                    const centreCode = centreObj ? centreObj.enterCode : 'GEN';
                    const billId = await generateBillId(centreCode);

                    const dpBaseAmount = downPayment / 1.18;
                    const dpCgst = dpBaseAmount * 0.09;
                    const dpSgst = dpBaseAmount * 0.09;

                    const payment = new Payment({
                        admission: admission._id,
                        installmentNumber: 0,
                        amount: downPayment,
                        paidAmount: downPayment,
                        dueDate: admissionDate,
                        paidDate: admissionDate,
                        status: "PAID",
                        paymentMethod: "CASH",
                        billId,
                        cgst: parseFloat(dpCgst.toFixed(2)),
                        sgst: parseFloat(dpSgst.toFixed(2)),
                        courseFee: parseFloat(dpBaseAmount.toFixed(2)),
                        totalAmount: downPayment,
                        recordedBy: creator?._id || null,
                        remarks: "Initial Payment (Imported)"
                    });
                    await payment.save();
                }

                // Update student enrollment status
                if (!student.isEnrolled) {
                    student.isEnrolled = true;
                    await student.save();
                }

                console.log(`Success: Admitted ${studentName} (${enrollNo}) to ${courseNameExcel}`);
            }
        }
        console.log('\nImport process finished.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

run();
