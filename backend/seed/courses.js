// backend/seed/courses.js
import mongoose from "mongoose";
import Course from "../models/Master_data/Courses.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import dns from "dns";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (backend folder)
dotenv.config({ path: path.join(__dirname, '../.env') });

// Force Node.js to use Google DNS servers instead of system DNS
// ONLY if not running on Render (Render has its own DNS)
if (!process.env.RENDER) {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
}

const courses = [
  {
    courseName: "JEE Main Two Year Program",
    examTag: "69284cd279ab9d40b14e3cec", // JEE Main
    courseDuration: "2 Years",
    coursePeriod: "Yearly",
    class: "6928440d7faf6960111c4f7f", // Class 11
    department: "69284f7c0b8a4e59dbc9e902", // Academic
    courseSession: "2025-2027",
    feesStructure: [
      { feesType: "Admission Fee", value: 20000, discount: "0%" },
      { feesType: "Tuition Fee", value: 120000, discount: "10%" },
      { feesType: "Material Fee", value: 15000, discount: "0%" }
    ],
    mode: "OFFLINE",
    courseType: "INSTATION"
  },
  {
    courseName: "NEET Two Year Medical Batch",
    examTag: "69284cd279ab9d40b14e3cee", // NEET
    courseDuration: "2 Years",
    coursePeriod: "Yearly",
    class: "6928440d7faf6960111c4f7f", // Class 11
    department: "69284f7c0b8a4e59dbc9e902", // Academic
    courseSession: "2025-2027",
    feesStructure: [
      { feesType: "Admission Fee", value: 20000, discount: "0%" },
      { feesType: "Tuition Fee", value: 130000, discount: "5%" }
    ],
    mode: "OFFLINE",
    courseType: "INSTATION"
  },
  {
    courseName: "JEE Main One Year Dropper",
    examTag: "69284cd279ab9d40b14e3cec", // JEE Main
    courseDuration: "1 Year",
    coursePeriod: "Yearly",
    class: "692844137faf6960111c4f82", // Class 12 (Using 12 for dropper proxy)
    department: "69284f7c0b8a4e59dbc9e902", // Academic
    courseSession: "2025-2026",
    feesStructure: [
      { feesType: "Lumpsum", value: 85000, discount: "0%" }
    ],
    mode: "OFFLINE",
    courseType: "INSTATION"
  },
  {
    courseName: "Class 10 Foundation",
    examTag: "69284cd279ab9d40b14e3cf0", // Class 10 Board
    courseDuration: "1 Year",
    coursePeriod: "Yearly",
    class: "6928440a7faf6960111c4f7c", // Class 10
    department: "69284f7c0b8a4e59dbc9e902", // Academic
    courseSession: "2025-2026",
    feesStructure: [
      { feesType: "Tuition Fee", value: 45000, discount: "10%" }
    ],
    mode: "ONLINE",
    courseType: "OUTSTATION"
  },
  {
    courseName: "NEET Crash Course",
    examTag: "69284cd279ab9d40b14e3cee", // NEET
    courseDuration: "3 Months",
    coursePeriod: "Monthly",
    class: "692844137faf6960111c4f82", // Class 12
    department: "69284f7c0b8a4e59dbc9e902", // Academic
    courseSession: "2025",
    feesStructure: [
      { feesType: "One Time", value: 15000, discount: "0%" }
    ],
    mode: "ONLINE",
    courseType: "INSTATION"
  }
];

const seedCourses = async () => {
  try {
    const mongoUri = process.env.MONGO_URL;
    
    // Connection options to handle DNS issues
    const options = {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
    };

    if (mongoUri.startsWith('mongodb+srv://')) {
        options.directConnection = false;
        options.retryWrites = true;
        options.w = 'majority';
    }

    await mongoose.connect(mongoUri, options);
    console.log("Connected to MongoDB");

    await Course.deleteMany({}); // Clear existing
    await Course.insertMany(courses);
    
    console.log("Courses seeded successfully!");
    console.log(`Total courses created: ${courses.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding Courses:", error);
    process.exit(1);
  }
};

seedCourses();
