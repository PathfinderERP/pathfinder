import mongoose from "mongoose";
import dotenv from "dotenv";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import Student from "../models/Students.js";
import Admission from "../models/Admission/admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import Course from "../models/Master_data/Courses.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the parent directory's .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

const exportDuplicateEmails = async () => {
  try {
    const mongoUri = process.env.MONGO_URL;
    if (!mongoUri) {
      console.error("❌ MONGO_URL not found in .env file.");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Database Connected");

    console.log("Scanning for duplicate emails in admissions...");

    const results = await Student.aggregate([
      // Unwind studentsDetails as it's an array in the schema
      { $unwind: "$studentsDetails" },
      // Filter out null or empty email addresses
      { 
        $match: { 
          "studentsDetails.studentEmail": { $ne: null, $ne: "" } 
        } 
      },
      // Group by lowercase email to identify duplicates (case-insensitive)
      {
        $group: {
          _id: { $toLower: "$studentsDetails.studentEmail" },
          count: { $sum: 1 },
          students: { 
            $push: {
              id: "$_id",
              name: "$studentsDetails.studentName",
              email: "$studentsDetails.studentEmail",
              mobile: "$studentsDetails.mobileNum",
              whatsapp: "$studentsDetails.whatsappNumber",
              centre: "$studentsDetails.centre",
              board: "$studentsDetails.board",
              class: "$studentsDetails.lastClass",
              programme: "$studentsDetails.programme",
              school: "$studentsDetails.schoolName",
              enrolled: "$isEnrolled",
              createdAt: "$createdAt"
            }
          }
        }
      },
      // Only keep groups where the email address is used more than once
      { $match: { count: { $gt: 1 } } },
      // Sort the final results alphabetically by email
      { $sort: { _id: 1 } }
    ]);

    if (results.length === 0) {
      console.log("No duplicate emails found in the database.");
      process.exit(0);
    }

    console.log(`Found ${results.length} email addresses that are used by multiple students.`);

    // Flatten the grouped data for a clean Excel sheet format
    const excelData = [];
    
    for (const group of results) {
      // Add a header/spacer row for the group
      excelData.push({
        "EMAIL ID (MIDDLE)": `--- GROUP: ${group._id.toUpperCase()} ---`
      });

      for (const student of group.students) {
        // Fetch Enrollment Number and Course Name
        let enrollmentNo = "N/A";
        let courseName = "N/A";

        // Try to find in Normal Admission
        const normalAdm = await Admission.findOne({ student: student.id }).populate('course').lean();
        if (normalAdm) {
          enrollmentNo = normalAdm.admissionNumber || "N/A";
          courseName = normalAdm.course?.courseName || "NORMAL COURSE";
        } else {
          // Try to find in Board Admission
          const boardAdm = await BoardCourseAdmission.findOne({ studentId: student.id }).lean();
          if (boardAdm) {
            enrollmentNo = boardAdm.admissionNumber || "N/A";
            courseName = boardAdm.boardCourseName || "BOARD COURSE";
          }
        }

        excelData.push({
          "STUDENT NAME": student.name,
          "ENROLLMENT NO": enrollmentNo,
          "MOBILE NO": student.mobile,
          "COURSE NAME": courseName,
          "EMAIL ID (MIDDLE)": student.email,
          "COURSE NAME (R)": courseName,
          "MOBILE NO (R)": student.mobile,
          "ENROLLMENT NO (R)": enrollmentNo,
          "STUDENT NAME (R)": student.name,
          "CENTRE": student.centre,
          "CREATED DATE": student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "N/A"
        });
      }
      
      // Blank row after each group
      excelData.push({});
    }

    // Create the Excel Workbook and Worksheet
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    
    // Set column widths for better visibility
    const colWidths = [
      { wch: 25 }, // Name
      { wch: 20 }, // Enrollment
      { wch: 15 }, // Mobile
      { wch: 30 }, // Course
      { wch: 35 }, // EMAIL (Middle)
      { wch: 30 }, // Course (R)
      { wch: 15 }, // Mobile (R)
      { wch: 20 }, // Enrollment (R)
      { wch: 25 }, // Name (R)
      { wch: 15 }, // Centre
      { wch: 15 }  // Created Date
    ];
    worksheet['!cols'] = colWidths;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Duplicate Emails Report");

    const outputPath = path.join(__dirname, "../duplicate_emails_report_v2.xlsx");
    xlsx.writeFile(workbook, outputPath);

    console.log(`\n✨ REPORT GENERATED SUCCESSFULLY`);
    console.log(`📍 File saved at: ${outputPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Critical Error during report generation:", error);
    process.exit(1);
  }
};

exportDuplicateEmails();
