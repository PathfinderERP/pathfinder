import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Admission from "../models/Admission/Admission.js";
import Student from "../models/Students.js";
import Payment from "../models/Payment/Payment.js";
import LeadManagement from "../models/LeadManagement.js";

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

        // 1. Admission records
        const admissionsToDelete = await Admission.find({ academicSession: { $nin: sessionsToKeep } }).select('_id student');
        const admissionIdsToDelete = admissionsToDelete.map(a => a._id);
        const studentIdsAffected = [...new Set(admissionsToDelete.map(a => a.student.toString()))];

        console.log(`Admissions to DELETE: ${admissionIdsToDelete.length}`);

        // 2. Payment records
        const paymentCount = await Payment.countDocuments({ admission: { $in: admissionIdsToDelete } });
        console.log(`Payments to DELETE: ${paymentCount}`);

        // 3. Student records logic
        // We need to know which students will have NO admissions left
        const studentAdmissions = await Admission.aggregate([
            {
                $group: {
                    _id: "$student",
                    keptCount: {
                        $sum: { $cond: [{ $in: ["$academicSession", sessionsToKeep] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            }
        ]);

        const studentsToRemove = studentAdmissions.filter(s => s.keptCount === 0).map(s => s._id);
        const studentsToUpdate = studentAdmissions.filter(s => s.keptCount > 0 && s.totalCount > s.keptCount).map(s => s._id);

        console.log(`Students to REMOVE entirely: ${studentsToRemove.length}`);
        console.log(`Students to partial CLEANUP (remove some admissions, update sessionExamCourse): ${studentsToUpdate.length}`);

        // 4. Lead Management
        // Leads might not have a session directly, but they might be associated with Courses.
        // If a Lead is converted to a Student, we might want to remove the Lead if the Student is removed.
        // Let's see if we can find any session data in LeadManagement indirectly.
        // Usually, Leads are matched with Students via mobile/email.

        const studentsToRemoveDocs = await Student.find({ _id: { $in: studentsToRemove } }).select('mobileNum studentEmail');
        const studentIdentifiers = [];
        studentsToRemoveDocs.forEach(s => {
            if (s.mobileNum) studentIdentifiers.push({ phoneNumber: s.mobileNum });
            if (s.studentEmail) studentIdentifiers.push({ email: s.studentEmail });
        });

        let leadCountToRemove = 0;
        if (studentIdentifiers.length > 0) {
            leadCountToRemove = await LeadManagement.countDocuments({ $or: studentIdentifiers });
        }
        console.log(`Leads to potentially REMOVE (matching removed students): ${leadCountToRemove}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error during dry run:", err);
    }
};

run();
