import mongoose from "mongoose";
import xlsx from "xlsx";
import dotenv from "dotenv";
import Course from "../models/Master_data/Courses.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import Student from "../models/Students.js";
import Centre from "../models/Master_data/Centre.js";

dotenv.config();

const filePath = "../exports_data/student_data (3)_hw.xlsx";

async function validate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected.");

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`Total students in Excel: ${data.length}`);

    const uniqueCourses = [...new Set(data.map(d => d['Course Name']))];
    const uniqueCentres = [...new Set(data.map(d => d['Centre']))];
    const uniqueSessions = [...new Set(data.map(d => d['Session']))];

    console.log("\n--- Validating Courses ---");
    const foundCourses = await Course.find({ courseName: { $in: uniqueCourses } }).lean();
    const foundCourseNames = foundCourses.map(c => c.courseName);
    const missingCourses = uniqueCourses.filter(c => !foundCourseNames.includes(c));
    console.log(`Found ${foundCourseNames.length} out of ${uniqueCourses.length} unique courses.`);
    if (missingCourses.length > 0) {
      console.log("Missing Courses:", missingCourses);
    }

    console.log("\n--- Validating Centres ---");
    const foundCentres = await Centre.find({ centreName: { $in: uniqueCentres } }).lean();
    const foundCentreNames = foundCentres.map(c => c.centreName);
    const missingCentres = uniqueCentres.filter(c => !foundCentreNames.includes(c));
    console.log(`Found ${foundCentreNames.length} out of ${uniqueCentres.length} unique centres.`);
    if (missingCentres.length > 0) {
      console.log("Missing Centres:", missingCentres);
    }

    console.log("\n--- Checking for Existing Enrollments (Already in System) ---");
    const enrollNos = data.map(d => d['Enroll No']).filter(id => id && id !== 'na' && id !== 'NA');
    const existingNormalAdmissions = await Admission.find({ admissionNumber: { $in: enrollNos } }).lean();
    const existingBoardAdmissions = await BoardCourseAdmission.find({ admissionNumber: { $in: enrollNos } }).lean();
    
    console.log(`Students already in Normal Admissions: ${existingNormalAdmissions.length}`);
    console.log(`Students already in Board Admissions: ${existingBoardAdmissions.length}`);

    console.log("\n--- Checking for Student Records by Phone ---");
    const phones = data.map(d => String(d['Phone']));
    const existingStudents = await Student.find({ "studentsDetails.mobileNum": { $in: phones } }).lean();
    console.log(`Student counts with matching mobile numbers: ${existingStudents.length}`);

    process.exit(0);
  } catch (err) {
    console.error("Validation failed:", err);
    process.exit(1);
  }
}

validate();
