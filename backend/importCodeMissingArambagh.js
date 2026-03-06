import "dotenv/config";
import mongoose from "mongoose";
import XLSX from "xlsx";
import connectDB from "./db/connect.js";
import Student from "./models/Students.js";
import Admission from "./models/Admission/Admission.js";
import Course from "./models/Master_data/Courses.js";
import Payment from "./models/Payment/Payment.js";
import CentreSchema from "./models/Master_data/Centre.js";

const ADMIN_ID = "6970c4129590082b81674b65";
const EXCEL_PATH = "c:\\Users\\MALAY\\erp_1\\exports_data\\CODE MISSING NEW ERP ARAMBAGH.xlsx";

// Default centre for this import
const DEFAULT_CENTRE_NAME = "ARAMBAGH";

const generateBillId = async (centreCode) => {
    try {
        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();

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
        console.error("Bill ID Gen Error:", error);
        return `PATH/${centreCode || 'GEN'}/${Date.now()}`;
    }
};

const runImport = async () => {
    try {
        await connectDB();
        console.log("Connected to DB.");

        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`Total rows to process: ${data.length}`);

        // Load ALL courses from DB
        const courses = await Course.find({});
        console.log(`Loaded ${courses.length} courses from DB.`);

        // Load centres
        const centresData = await CentreSchema.find({});
        const centreMap = {};
        centresData.forEach(c => {
            centreMap[c.centreName.toUpperCase()] = c;
        });

        // Get default centre object
        const defaultCentreObj = centreMap[DEFAULT_CENTRE_NAME] || null;
        if (!defaultCentreObj) {
            console.warn(`WARNING: Centre "${DEFAULT_CENTRE_NAME}" not found in DB. Bill IDs will use fallback code.`);
        }

        const stats = {
            created: 0,
            addedCourse: 0,
            skipped: 0,
            errors: 0
        };

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const enrollNo = row['Enroll No'] ? row['Enroll No'].toString().trim() : null;
            const studentName = row['Student Name'] ? row['Student Name'].toString().trim() : null;
            const courseNameFromExcel = row['Course Name'] ? row['Course Name'].toString().trim() : null;
            const phone = row['Phone'] ? row['Phone'].toString().replace(/\D/g, '').slice(-10) : '0000000000';

            if (!enrollNo || !studentName || !courseNameFromExcel) {
                console.warn(`[${i + 1}/${data.length}] Skipping row - incomplete data`);
                stats.errors++;
                continue;
            }

            console.log(`\n[${i + 1}/${data.length}] Processing: ${studentName} | ${enrollNo} | Course: ${courseNameFromExcel}`);

            // --- Course Matching ---
            // Strategy: match by exact course name (case-insensitive), or partial match
            // The session is often the last part of the course name e.g. "2026-2027" or "2026-2028"
            let matchedCourse = null;
            let matchedSession = null;

            // Try exact match first (case-insensitive)
            const exactMatch = courses.find(c =>
                c.courseName.toLowerCase() === courseNameFromExcel.toLowerCase()
            );

            if (exactMatch) {
                matchedCourse = exactMatch;
                matchedSession = exactMatch.courseSession;
                console.log(`  - Exact course match: ${matchedCourse.courseName} | Session: ${matchedSession}`);
            } else {
                // Try to find a course where courseName is contained in the Excel course name
                // Extract session from course name (last YYYY-YYYY pattern)
                const sessionMatch = courseNameFromExcel.match(/(\d{4}-\d{4})/);
                const sessionFromName = sessionMatch ? sessionMatch[1] : null;

                // Build a base name without the session part
                const baseCourseName = sessionFromName
                    ? courseNameFromExcel.replace(sessionFromName, '').trim().replace(/-\s*$/, '').trim()
                    : courseNameFromExcel;

                console.log(`  - Trying partial match: base="${baseCourseName}", session="${sessionFromName}"`);

                // First try: match course name + session from the DB
                if (sessionFromName) {
                    const sessionCourses = courses.filter(c => c.courseSession === sessionFromName);
                    const partialMatch = sessionCourses.find(c =>
                        c.courseName.toLowerCase().includes(baseCourseName.toLowerCase()) ||
                        baseCourseName.toLowerCase().includes(c.courseName.toLowerCase()) ||
                        c.courseName.toLowerCase() === courseNameFromExcel.toLowerCase()
                    );
                    if (partialMatch) {
                        matchedCourse = partialMatch;
                        matchedSession = partialMatch.courseSession;
                        console.log(`  - Partial match found: ${matchedCourse.courseName} | Session: ${matchedSession}`);
                    }
                }

                if (!matchedCourse) {
                    // Last resort: show all similar courses
                    const similarCourses = courses.filter(c =>
                        c.courseName.toLowerCase().includes(baseCourseName.toLowerCase().substring(0, 10))
                    );
                    console.error(`  - ERROR: Could not match course: "${courseNameFromExcel}"`);
                    if (similarCourses.length > 0) {
                        console.log(`  - Similar courses in DB:`);
                        similarCourses.slice(0, 5).forEach(c => console.log(`      - "${c.courseName}" [Session: ${c.courseSession}]`));
                    }
                    stats.errors++;
                    continue;
                }
            }

            // --- Enrollment Check ---
            const existingAdmission = await Admission.findOne({ admissionNumber: enrollNo });

            if (!existingAdmission) {
                // CREATE NEW STUDENT + ADMISSION
                console.log(`  - No existing admission found. Creating new student...`);

                const student = new Student({
                    studentsDetails: [{
                        studentName: studentName,
                        dateOfBirth: "",
                        gender: "Male",
                        centre: DEFAULT_CENTRE_NAME,
                        board: "",
                        studentEmail: "",
                        mobileNum: phone,
                        whatsappNumber: phone,
                        schoolName: "",
                        pincode: "",
                        address: ""
                    }],
                    guardians: [{}],
                    status: 'Active',
                    isEnrolled: true
                });

                await student.save();

                await createAdmissionRecord(student._id, matchedCourse, matchedSession, enrollNo, phone, defaultCentreObj);
                console.log(`  - ✅ CREATED new student and admission.`);
                stats.created++;

            } else {
                // STUDENT EXISTS - check if this course/session admission also exists
                console.log(`  - Existing admission found (Student: ${existingAdmission.student}) for enroll ${enrollNo}`);

                const sameAdmission = await Admission.findOne({
                    student: existingAdmission.student,
                    course: matchedCourse._id,
                    academicSession: matchedSession
                });

                if (!sameAdmission) {
                    // Different course/session - create new admission for same student
                    await createAdmissionRecord(existingAdmission.student, matchedCourse, matchedSession, enrollNo, phone, defaultCentreObj);
                    console.log(`  - ✅ ADDED new course admission to existing student.`);
                    stats.addedCourse++;
                } else {
                    console.log(`  - ⏭️  SKIPPED: Student already enrolled in this exact course/session.`);
                    stats.skipped++;
                }
            }
        }

        console.log("\n==========================================");
        console.log("Import Summary:");
        console.log(`  ✅ Created new students:     ${stats.created}`);
        console.log(`  ✅ Added courses to existing: ${stats.addedCourse}`);
        console.log(`  ⏭️  Skipped (already exists): ${stats.skipped}`);
        console.log(`  ❌ Errors:                   ${stats.errors}`);
        console.log("==========================================");

        process.exit(0);
    } catch (error) {
        console.error("Import failed:", error);
        process.exit(1);
    }
};

const createAdmissionRecord = async (studentId, course, session, admissionNumber, phone, centreObj) => {
    const today = new Date();

    // Use course fees structure
    const baseFees = course.feesStructure?.reduce((sum, fee) => sum + (fee.value || 0), 0) || 0;
    const cgstAmount = Math.round(baseFees * 0.09);
    const sgstAmount = Math.round(baseFees * 0.09);
    const totalFees = baseFees + cgstAmount + sgstAmount;

    const downPayment = 0;
    const remainingAmount = totalFees;
    const numberOfInstallments = 1;
    const installmentAmount = remainingAmount;

    const paymentBreakdown = [{
        installmentNumber: 1,
        dueDate: today,
        amount: installmentAmount,
        status: "PENDING"
    }];

    const admission = new Admission({
        student: studentId,
        admissionType: "NORMAL",
        admissionNumber: admissionNumber,
        course: course._id,
        class: course.class,
        examTag: course.examTag,
        department: course.department,
        centre: DEFAULT_CENTRE_NAME,
        academicSession: session,
        admissionDate: today,
        baseFees,
        discountAmount: 0,
        cgstAmount,
        sgstAmount,
        totalFees,
        downPayment,
        remainingAmount,
        numberOfInstallments,
        installmentAmount,
        paymentBreakdown,
        feeStructureSnapshot: course.feesStructure || [],
        createdBy: ADMIN_ID,
        totalPaidAmount: 0,
        paymentStatus: "PENDING",
        downPaymentStatus: "PENDING",
    });

    await admission.save();

    await Student.findByIdAndUpdate(studentId, {
        $set: { isEnrolled: true, carryForwardBalance: 0 }
    });

    console.log(`  - Admission record created: ${admissionNumber} | Course: ${course.courseName} | Session: ${session}`);
};

const DEFAULT_CENTRE_NAME_REF = DEFAULT_CENTRE_NAME; // keep in scope for createAdmissionRecord

runImport();
