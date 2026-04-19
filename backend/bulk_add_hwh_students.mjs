import mongoose from 'mongoose';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import Department from './models/Master_data/Department.js';
import ClassRecord from './models/Master_data/Class.js';
import ExamTag from './models/Master_data/ExamTag.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const EXCEL_PATH = 'c:\\Users\\MALAY\\erp_1\\exports_data\\hwh_fnd.xlsx';
const SKIPPED_FILE = 'c:\\Users\\MALAY\\erp_1\\exports_data\\skipped_hwh_enrollments.json';
const ADMIN_ID = "6970c4129590082b81674b65"; // As per All_student_insert.js
const TARGET_CENTRE = "HOWRAH_FRANCHISE";

async function bulkAddStudents() {
    try {
        if (!MONGO_URL) throw new Error("MONGO_URL not found in .env");
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        const wb = xlsx.readFile(EXCEL_PATH);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

        console.log(`Processing ${data.length} records...`);

        const skipped = [];
        let addedCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const enrollNo = row["Enroll No"];
            if (!enrollNo) {
                console.warn(`⚠️ Row skipped: No Enroll No found.`);
                continue;
            }

            // Check if enrollment already exists in Admission
            const existingAdmission = await Admission.findOne({ admissionNumber: enrollNo });
            if (existingAdmission) {
                skipped.push({
                    enrollNo,
                    name: row["Student Name"],
                    reason: "Admission number already exists"
                });
                skipCount++;
                continue;
            }

            try {
                // 1. Resolve Course
                const courseName = row["Course Name"];
                const course = await Course.findOne({ courseName }).populate('class department examTag');
                if (!course) {
                    console.error(`❌ Course not found: "${courseName}" for ${enrollNo}. Skipping.`);
                    skipped.push({ enrollNo, name: row["Student Name"], reason: `Course not found: ${courseName}` });
                    errorCount++;
                    continue;
                }

                // 2. Prepare Student Data
                const student = new Student({
                    studentsDetails: [{
                        studentName: row["Student Name"],
                        dateOfBirth: row["dob"] ? new Date(row["dob"]).toISOString() : null,
                        gender: row["Gender"],
                        centre: TARGET_CENTRE,
                        board: row["Board"],
                        studentEmail: row["email"] || `${enrollNo.toLowerCase()}@pathfinder.com`,
                        mobileNum: row["Phone"] ? String(row["Phone"]).slice(-10) : "9999999999",
                        whatsappNumber: row["Phone"] ? String(row["Phone"]).slice(-10) : "9999999999",
                        schoolName: row["School"],
                        pincode: String(row["Pincode"]),
                        programme: course.programme || 'CRP',
                        class: course.class?._id,
                        guardians: [{
                            guardianName: row["Guardians Name"],
                            guardianEmail: row["Guardians Email Address"],
                            guardianMobile: row["Guardians Mobile Number"] ? String(row["Guardians Mobile Number"]).slice(-10) : "",
                            occupation: row["Guardians Occupation"],
                            qualification: row["Guardians Qualification"]
                        }]
                    }],
                    course: course._id,
                    department: course.department?._id,
                    isEnrolled: true,
                    status: 'Active',
                    counselledBy: row["Admitted By"] || ""
                });

                // Also add guardians to the top-level array if required by schema
                student.guardians = [{
                    guardianName: row["Guardians Name"],
                    guardianEmail: row["Guardians Email Address"],
                    guardianMobile: row["Guardians Mobile Number"] ? String(row["Guardians Mobile Number"]).slice(-10) : "",
                    occupation: row["Guardians Occupation"],
                    qualification: row["Guardians Qualification"]
                }];

                const savedStudent = await student.save();

                // 3. Financial Calculations
                const totalFees = parseFloat(row["Commited Amount"]) || 0;
                const paidAmount = parseFloat(row["Total Amount Paid Till Date"]) || 0;
                
                // Reverse calculate base fees (assuming 18% GST)
                const baseFees = parseFloat((totalFees / 1.18).toFixed(2));
                const cgst = parseFloat((baseFees * 0.09).toFixed(2));
                const sgst = parseFloat((baseFees * 0.09).toFixed(2));

                // 4. Create Admission
                const admissionDate = row["Admission Date"] ? new Date(row["Admission Date"]) : new Date();
                
                const admission = new Admission({
                    student: savedStudent._id,
                    admissionType: "NORMAL",
                    course: course._id,
                    class: course.class?._id,
                    examTag: course.examTag?._id,
                    department: course.department?._id,
                    centre: TARGET_CENTRE,
                    admissionNumber: enrollNo,
                    academicSession: row["Session"] || course.courseSession || "2025-2026",
                    baseFees: baseFees,
                    cgstAmount: cgst,
                    sgstAmount: sgst,
                    totalFees: totalFees,
                    downPayment: paidAmount,
                    downPaymentStatus: "PAID",
                    downPaymentMethod: "CASH",
                    downPaymentReceivedDate: admissionDate,
                    remainingAmount: Math.max(0, totalFees - paidAmount),
                    numberOfInstallments: (totalFees - paidAmount > 0) ? 1 : 0,
                    installmentAmount: Math.max(0, totalFees - paidAmount),
                    paymentStatus: (totalFees - paidAmount <= 0) ? "COMPLETED" : "PARTIAL",
                    totalPaidAmount: paidAmount,
                    createdBy: ADMIN_ID,
                    admissionDate: admissionDate,
                    sectionAllotment: {
                        omrCode: enrollNo
                    }
                });

                await admission.save();
                addedCount++;
                if (addedCount % 50 === 0) console.log(`✅ Added ${addedCount} students...`);

            } catch (err) {
                console.error(`❌ Error adding ${enrollNo}:`, err.message);
                skipped.push({ enrollNo, name: row["Student Name"], reason: err.message });
                errorCount++;
            }
        }

        // Save skipped records
        fs.writeFileSync(SKIPPED_FILE, JSON.stringify(skipped, null, 2));

        console.log(`\n🎉 Process Complete:`);
        console.log(`- Total Added: ${addedCount}`);
        console.log(`- Skiped (Existing): ${skipCount}`);
        console.log(`- Failed/Errors: ${errorCount}`);
        console.log(`- Skipped details saved to: ${SKIPPED_FILE}`);

    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        await mongoose.disconnect();
    }
}

bulkAddStudents();
