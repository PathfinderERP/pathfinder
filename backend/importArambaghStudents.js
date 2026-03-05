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
const EXCEL_PATH = "c:\\Users\\USER\\erp_1\\exports_data\\student_data2628Arambagh.xlsx";

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
            const lastId = lastPayment.billId;
            const parts = lastId.split('/');
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

const parseDate = (val) => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    // Excel might provide a serial number
    if (typeof val === 'number') {
        const date = new Date((val - (25567 + 1)) * 86400 * 1000); // 25568 is the offset for excel dates
        return date;
    }
    const parts = val.split('/');
    if (parts.length === 3) {
        // Assume DD/MM/YYYY
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const y = parseInt(parts[2]);
        return new Date(y, m, d);
    }
    return new Date(val);
};

const runImport = async () => {
    try {
        await connectDB();
        console.log("Connected to DB.");

        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`Total rows to process: ${data.length}`);

        // Load courses
        const courses = await Course.find({});
        const courseMap = {};
        courses.forEach(c => {
            courseMap[c.courseName + "_" + c.courseSession] = c;
        });

        // Load centres
        const centresData = await CentreSchema.find({});
        const centreMap = {};
        centresData.forEach(c => {
            centreMap[c.centreName.toUpperCase()] = c;
        });

        const stats = {
            created: 0,
            addedCourse: 0,
            skipped: 0,
            errors: 0
        };

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const enrollNo = row['Enroll No'];
            const studentName = row['Student Name'];
            const courseName = row['Course Name'];
            const session = row['Session'];
            const centreName = row['Centre'] ? row['Centre'].toUpperCase() : 'ARAMBAGH';

            console.log(`[${i + 1}/${data.length}] Processing ${studentName} (${enrollNo})...`);

            const course = courseMap[courseName + "_" + session];
            if (!course) {
                console.error(`  - Course not found: ${courseName} for session ${session}. Skipping.`);
                stats.errors++;
                continue;
            }

            const existingAdmission = await Admission.findOne({ admissionNumber: enrollNo });

            if (!existingAdmission) {
                // CREATE STUDENT + ADMISSION
                const student = new Student({
                    studentsDetails: [{
                        studentName: studentName,
                        dateOfBirth: row['dob'] ? row['dob'].toString() : "",
                        gender: row['Gender'] || "Male",
                        centre: row['Centre'] || "ARAMBAGH",
                        board: row['Board'] || "",
                        studentEmail: row['email'] || "",
                        mobileNum: row['Phone'] ? row['Phone'].toString().replace(/\D/g, '').slice(-10) : "0000000000",
                        whatsappNumber: row['Phone'] ? row['Phone'].toString().replace(/\D/g, '').slice(-10) : "0000000000",
                        schoolName: row['School'] || "",
                        pincode: row['Pincode'] ? row['Pincode'].toString() : "",
                        address: row['Address'] || ""
                    }],
                    guardians: [{
                        guardianName: row['Guardians Name'] || "",
                        guardianEmail: row['Guardians Email Address'] || "",
                        guardianMobile: row['Guardians Mobile Number'] ? row['Guardians Mobile Number'].toString().replace(/\D/g, '').slice(-10) : "",
                        occupation: row['Guardians Occupation'] || "",
                        qualification: row['Guardians Qualification'] || ""
                    }],
                    status: 'Active',
                    isEnrolled: true
                });

                await student.save();

                await createAdmissionRecord(student._id, course, row, enrollNo, centreMap[centreName]);
                console.log(`  - Created new student and admission.`);
                stats.created++;
            } else {
                // CHECK IF COURSE/SESSION MATCHES
                if (existingAdmission.course.toString() !== course._id.toString() || existingAdmission.academicSession !== session) {
                    // Check if already has THIS course admission
                    const anotherAdmission = await Admission.findOne({ student: existingAdmission.student, course: course._id, academicSession: session });
                    if (!anotherAdmission) {
                        await createAdmissionRecord(existingAdmission.student, course, row, enrollNo, centreMap[centreName]);
                        console.log(`  - Assigned new course to existing student.`);
                        stats.addedCourse++;
                    } else {
                        console.log(`  - Student already enrolled in this course. Skipping.`);
                        stats.skipped++;
                    }
                } else {
                    console.log(`  - Student already enrolled in this exact course/session. Skipping.`);
                    stats.skipped++;
                }
            }
        }

        console.log("\nImport Summary:");
        console.log(`- Created: ${stats.created}`);
        console.log(`- Added Course: ${stats.addedCourse}`);
        console.log(`- Skipped: ${stats.skipped}`);
        console.log(`- Errors: ${stats.errors}`);

        process.exit(0);
    } catch (error) {
        console.error("Import failed:", error);
        process.exit(1);
    }
};

const createAdmissionRecord = async (studentId, course, row, admissionNumber, centreObj) => {
    const totalFeesExcel = parseFloat(row['Commited Amount'] || 0);
    let baseFees, cgstAmount, sgstAmount, totalFees;

    if (totalFeesExcel > 0) {
        totalFees = totalFeesExcel;
        const calculatedBase = totalFees / 1.18;
        cgstAmount = Math.round(calculatedBase * 0.09);
        sgstAmount = Math.round(calculatedBase * 0.09);
        baseFees = totalFees - cgstAmount - sgstAmount;
    } else {
        baseFees = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
        cgstAmount = Math.round(baseFees * 0.09);
        sgstAmount = Math.round(baseFees * 0.09);
        totalFees = baseFees + cgstAmount + sgstAmount;
    }

    const downPayment = parseFloat(row['Admission Amount'] || 0);
    const remainingAmount = Math.max(0, totalFees - downPayment);
    const numberOfInstallments = 1;
    const installmentAmount = Math.ceil(remainingAmount / numberOfInstallments);

    const paymentBreakdown = [];
    const admDate = parseDate(row['Admission Date']);

    for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(admDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        paymentBreakdown.push({
            installmentNumber: i + 1,
            dueDate: dueDate,
            amount: i === numberOfInstallments - 1 ? (remainingAmount - (installmentAmount * (numberOfInstallments - 1))) : installmentAmount,
            status: "PENDING"
        });
    }

    const admission = new Admission({
        student: studentId,
        admissionType: "NORMAL",
        admissionNumber: admissionNumber,
        course: course._id,
        class: course.class,
        examTag: course.examTag,
        department: course.department,
        centre: row['Centre'] || "ARAMBAGH",
        academicSession: row['Session'],
        admissionDate: admDate,
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
        feeStructureSnapshot: course.feesStructure,
        createdBy: ADMIN_ID,
        totalPaidAmount: downPayment,
        paymentStatus: (downPayment >= totalFees) ? "COMPLETED" : "PARTIAL",
        downPaymentStatus: "PAID",
        downPaymentReceivedDate: admDate,
        downPaymentMethod: "CASH"
    });

    await admission.save();

    await Student.findByIdAndUpdate(studentId, {
        $set: { isEnrolled: true, carryForwardBalance: 0 }
    });

    if (downPayment > 0) {
        const dpBaseAmount = downPayment / 1.18;
        const dpCgst = dpBaseAmount * 0.09;
        const dpSgst = dpBaseAmount * 0.09;
        const dpCourseFee = downPayment - dpCgst - dpSgst;

        const centreCode = centreObj ? centreObj.enterCode : 'GEN';
        const billId = await generateBillId(centreCode);

        const payment = new Payment({
            admission: admission._id,
            installmentNumber: 0,
            amount: downPayment,
            paidAmount: downPayment,
            dueDate: admDate,
            paidDate: admDate,
            receivedDate: admDate,
            status: "PAID",
            paymentMethod: "CASH",
            remarks: "Imported Admission Payment",
            recordedBy: ADMIN_ID,
            cgst: parseFloat(dpCgst.toFixed(2)),
            sgst: parseFloat(dpSgst.toFixed(2)),
            courseFee: parseFloat(dpCourseFee.toFixed(2)),
            totalAmount: downPayment,
            billId: billId
        });
        await payment.save();
    }
};

runImport();
