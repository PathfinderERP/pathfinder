import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Students.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";

dotenv.config();

async function findAdmissions() {
    try {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder");
        console.log("Connected to MongoDB");

        console.log("Searching in Admission collection for studentName containing ANKAN MAITY...");
        // Since student is populated, we can look up by first querying all admissions and then filtering, or by finding all students matching ANKAN MAITY
        const students = await Student.find({
            "studentsDetails.studentName": /ANKAN MAITY/i
        }).lean();

        console.log(`Found ${students.length} students matching ANKAN MAITY`);
        for (const s of students) {
            console.log(`Student ID: ${s._id}, Name: ${s.studentsDetails[0]?.studentName}`);
            
            const normalAdms = await Admission.find({ student: s._id }).lean();
            console.log(`- Normal Admissions count: ${normalAdms.length}`);
            for (const adm of normalAdms) {
                console.log(`  - Admission ID: ${adm._id}, AdmissionNo: ${adm.admissionNumber}, Type: ${adm.admissionType}`);
            }

            const boardAdms = await BoardCourseAdmission.find({ studentId: s._id }).lean();
            console.log(`- Board Admissions count: ${boardAdms.length}`);
            for (const adm of boardAdms) {
                console.log(`  - Board Admission ID: ${adm._id}, AdmissionNo: ${adm.admissionNumber}`);
            }
        }

        console.log("\nSearching for any Admission/BoardCourseAdmission with ID starting with '6a2'...");
        if (mongoose.Types.ObjectId.isValid("6a2811111111111111111111")) {
            // Find by prefix/regex or find all and check ID
            // An ObjectId prefix is not directly regex-able unless we cast to string or query by range
            // Let's query by range: 6a2811100000000000000000 <= id <= 6a28111fffffffffffffffff
            const minId = new mongoose.Types.ObjectId("6a2811100000000000000000");
            const maxId = new mongoose.Types.ObjectId("6a28111fffffffffffffffff");

            const normalRange = await Admission.find({ _id: { $gte: minId, $lte: maxId } }).lean();
            console.log(`Normal Admissions starting with 6a28111: ${normalRange.length}`);
            for (const r of normalRange) {
                console.log(`  - ID: ${r._id}, student: ${r.student}, admissionNumber: ${r.admissionNumber}`);
            }

            const boardRange = await BoardCourseAdmission.find({ _id: { $gte: minId, $lte: maxId } }).lean();
            console.log(`Board Admissions starting with 6a28111: ${boardRange.length}`);
            for (const r of boardRange) {
                console.log(`  - ID: ${r._id}, studentId: ${r.studentId}, admissionNumber: ${r.admissionNumber}`);
            }
        }

    } catch (error) {
        console.error("Error debugging:", error);
    } finally {
        await mongoose.disconnect();
    }
}

findAdmissions();
