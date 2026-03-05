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
const EXCEL_FILES = [
    "c:\\Users\\USER\\erp_1\\exports_data\\student_data(26-30).xlsx"
];

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
    if (typeof val === 'number') {
        const date = new Date((val - (25567 + 1)) * 86400 * 1000);
        return date;
    }
    const parts = val.toString().split('/');
    if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const y = parseInt(parts[2]);
        return new Date(y, m, d);
    }
    return new Date(val);
};

const createAdmissionRecord = async (studentId, course, row, admissionNumber, centreObj) => {
    const totalFeesExcel = parseFloat(row['Commited Amount'] || 0);
    let baseFees, cgstAmount, sgstAmount, totalFees;

    if (totalFeesExcel > 0) {
        baseFees = totalFeesExcel;
        cgstAmount = Math.round(baseFees * 0.09);
        sgstAmount = Math.round(baseFees * 0.09);
        totalFees = baseFees + cgstAmount + sgstAmount;
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
        const dpBaseAmount = downPayment;
        const dpCgst = dpBaseAmount * 0.09;
        const dpSgst = dpBaseAmount * 0.09;
        const dpTotal = dpBaseAmount + dpCgst + dpSgst;

        const centreCode = centreObj ? centreObj.enterCode : 'GEN';
        const billId = await generateBillId(centreCode);

        const payment = new Payment({
            admission: admission._id,
            installmentNumber: 0,
            amount: dpTotal,
            paidAmount: dpTotal,
            dueDate: admDate,
            paidDate: admDate,
            receivedDate: admDate,
            status: "PAID",
            paymentMethod: "CASH",
            remarks: "Imported Admission Payment (GST Extra)",
            recordedBy: ADMIN_ID,
            cgst: parseFloat(dpCgst.toFixed(2)),
            sgst: parseFloat(dpSgst.toFixed(2)),
            courseFee: parseFloat(dpBaseAmount.toFixed(2)),
            totalAmount: dpTotal,
            billId: billId
        });
        await payment.save();

        // Update admission's totalPaidAmount and remainingAmount with the new GST-inclusive total
        admission.totalPaidAmount = dpTotal;
        admission.remainingAmount = Math.max(0, totalFees - dpTotal);
        admission.paymentStatus = (dpTotal >= totalFees) ? "COMPLETED" : "PARTIAL";
        admission.paymentBreakdown[0].amount = admission.remainingAmount;
        await admission.save();
    }
};

const runBulkImport = async () => {
    try {
        await connectDB();
        console.log("Connected to DB.");

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

        const overallStats = {
            created: 0,
            addedCourse: 0,
            skipped: 0,
            errors: 0,
            newCourses: []
        };

        // Pre-scan for missing courses
        console.log("Scanning for missing courses...");
        const missingCourses = new Set();
        for (const filePath of EXCEL_FILES) {
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);
            data.forEach(row => {
                const cName = row['Course Name'];
                const cSess = row['Session'];
                if (cName && cSess && !courseMap[cName + "_" + cSess]) {
                    missingCourses.add(cName + "|" + cSess);
                }
            });
        }

        if (missingCourses.size > 0) {
            console.log(`Found ${missingCourses.size} missing courses. Creating them...`);
            const defaultDept = await mongoose.connection.collection('departments').findOne({ departmentName: /Foundation/i }) || await mongoose.connection.collection('departments').findOne({});
            const defaultExamTag = await mongoose.connection.collection('examtags').findOne({ name: /FOUNDATION/i }) || await mongoose.connection.collection('examtags').findOne({});
            const defaultClass = await mongoose.connection.collection('classes').findOne({ name: /10/i }) || await mongoose.connection.collection('classes').findOne({});

            for (const item of missingCourses) {
                const [cName, cSess] = item.split('|');
                console.log(`  - Creating course: ${cName} (${cSess})...`);

                const newCourse = new Course({
                    courseName: cName,
                    courseSession: cSess,
                    department: defaultDept._id,
                    examTag: defaultExamTag._id,
                    class: defaultClass ? defaultClass._id : null,
                    courseDuration: "1 Year",
                    coursePeriod: "Yearly",
                    mode: "OFFLINE",
                    feesStructure: [{ feesType: "Admission Fee", value: 0, discount: "0" }]
                });

                await newCourse.save();
                courseMap[cName + "_" + cSess] = newCourse;
                overallStats.newCourses.push(`${cName} (${cSess})`);
            }
        }

        for (const filePath of EXCEL_FILES) {
            console.log(`\n--- Importing file: ${filePath} ---`);
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);
            console.log(`Rows to process: ${data.length}`);

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const enrollNo = row['Enroll No'] ? row['Enroll No'].toString().trim() : null;
                const studentName = row['Student Name'];

                if (!enrollNo) {
                    console.log(`  - [${i + 1}/${data.length}] Skipping row with no Enroll No.`);
                    continue;
                }

                const courseName = row['Course Name'];
                const session = row['Session'];
                const centreName = row['Centre'] ? row['Centre'].toUpperCase() : 'ARAMBAGH';

                console.log(`  - [${i + 1}/${data.length}] ${studentName} (${enrollNo})...`);

                const course = courseMap[courseName + "_" + session];
                if (!course) {
                    console.error(`    * Course not found: ${courseName} for session ${session}. Skipping.`);
                    overallStats.errors++;
                    continue;
                }

                try {
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
                                mobileNum: row['Phone'] ? row['Phone'].toString().replace(/\D/g, '').slice(-10).padStart(10, '0') : "0000000000",
                                whatsappNumber: row['Phone'] ? row['Phone'].toString().replace(/\D/g, '').slice(-10).padStart(10, '0') : "0000000000",
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
                        overallStats.created++;
                    } else {
                        // CHECK IF COURSE/SESSION MATCHES
                        if (existingAdmission.course.toString() !== course._id.toString() || existingAdmission.academicSession !== session) {
                            const anotherAdmission = await Admission.findOne({ student: existingAdmission.student, course: course._id, academicSession: session });
                            if (!anotherAdmission) {
                                await createAdmissionRecord(existingAdmission.student, course, row, enrollNo, centreMap[centreName]);
                                overallStats.addedCourse++;
                            } else {
                                overallStats.skipped++;
                            }
                        } else {
                            overallStats.skipped++;
                        }
                    }
                } catch (err) {
                    console.error(`    * Error processing ${enrollNo}: ${err.message}`);
                    overallStats.errors++;
                }
            }
        }

        console.log("\n--- Bulk Import Final Summary ---");
        console.log(`- Created Students: ${overallStats.created}`);
        console.log(`- Added Courses to Existing: ${overallStats.addedCourse}`);
        console.log(`- Skipped: ${overallStats.skipped}`);
        console.log(`- Errors: ${overallStats.errors}`);

        if (overallStats.newCourses.length > 0) {
            console.log("\nNew Courses Created:");
            overallStats.newCourses.forEach(c => console.log(`  * ${c}`));
        }

        process.exit(0);
    } catch (error) {
        console.error("Bulk Import failed:", error);
        process.exit(1);
    }
};

runBulkImport();
