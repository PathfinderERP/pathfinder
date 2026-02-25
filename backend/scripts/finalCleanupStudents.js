import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Admission from "../models/Admission/Admission.js";
import Student from "../models/Students.js";
import Payment from "../models/Payment/Payment.js";
import StudentAttendance from "../models/Academics/StudentAttendance.js";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const sessionsToKeep = [
    "2026-2027", "2026-2028", "2025-2028", "2025-2029", "2026-2029", "2026-2030",
    "2025-2027", "2024-2030", "2024-2027", "2023-2027", "2024-2028", "2024-2029",
    "2023-2028", "2024-2031", "2025-2030", "2025-2031"
];

const run = async () => {
    try {
        if (!process.env.MONGO_URL) {
            throw new Error("MONGO_URL not found in .env");
        }
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        // 1. Identify Admissions to delete
        console.log("Identifying data for deletion...");
        const targetAdmissions = await Admission.find({
            academicSession: { $nin: sessionsToKeep }
        }).select('_id student academicSession').lean();

        const targetAdmissionIds = targetAdmissions.map(a => a._id);
        const affectedStudentIds = [...new Set(targetAdmissions.map(a => a.student.toString()))];

        if (targetAdmissionIds.length === 0) {
            console.log("No admissions found outside the Keep list. Nothing to delete.");
            await mongoose.disconnect();
            return;
        }

        console.log(`Found ${targetAdmissionIds.length} Admissions to delete.`);

        // 2. Identify Students to keep vs delete entirely
        const keepAdmissions = await Admission.find({
            academicSession: { $in: sessionsToKeep }
        }).select('student').lean();

        const studentIdsToKeep = new Set(keepAdmissions.map(a => a.student.toString()));

        const studentIdsToDeleteEntirely = affectedStudentIds.filter(id => !studentIdsToKeep.has(id));
        const studentIdsToCleanup = affectedStudentIds.filter(id => studentIdsToKeep.has(id));

        console.log(`- Students to delete entirely (0 courses remaining): ${studentIdsToDeleteEntirely.length}`);
        console.log(`- Students to partially cleanup (mixed courses): ${studentIdsToCleanup.length}`);

        // 3. Delete Payments
        console.log("Deleting Payments associated with target admissions...");
        const paymentDeleteResult = await Payment.deleteMany({ admission: { $in: targetAdmissionIds } });
        console.log(`Deleted ${paymentDeleteResult.deletedCount} Payment records.`);

        // 4. Delete Admissions
        console.log("Deleting Admission records...");
        const admissionDeleteResult = await Admission.deleteMany({ _id: { $in: targetAdmissionIds } });
        console.log(`Deleted ${admissionDeleteResult.deletedCount} Admission records.`);

        // 5. Cleanup Students (Mixed Courses)
        if (studentIdsToCleanup.length > 0) {
            console.log("Cleaning up sessionExamCourse for mixed-session students...");
            const studentUpdateResult = await Student.updateMany(
                { _id: { $in: studentIdsToCleanup } },
                { $pull: { sessionExamCourse: { session: { $nin: sessionsToKeep } } } }
            );
            console.log(`Updated ${studentUpdateResult.modifiedCount} Students.`);
        }

        // 6. Delete Students Entirely
        if (studentIdsToDeleteEntirely.length > 0) {
            console.log("Deleting Student records and their attendance...");
            const studentDeleteResult = await Student.deleteMany({ _id: { $in: studentIdsToDeleteEntirely } });
            console.log(`Deleted ${studentDeleteResult.deletedCount} Student records.`);

            const attendanceDeleteResult = await StudentAttendance.deleteMany({ studentId: { $in: studentIdsToDeleteEntirely } });
            console.log(`Deleted ${attendanceDeleteResult.deletedCount} Attendance records for these students.`);
        }

        console.log("\nDATA CLEANUP COMPLETED SUCCESSFULLY.");
        console.log("Finance and Sales portals will reflect these changes automatically.");

        await mongoose.disconnect();
    } catch (err) {
        console.error("CRITICAL ERROR DURING CLEANUP:", err);
        process.exit(1);
    }
};

run();
