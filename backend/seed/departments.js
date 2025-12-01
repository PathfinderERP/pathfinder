// backend/seed/departments.js
import mongoose from "mongoose";
import Department from "../models/Master_data/Department.js";
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

const departments = [
  {
    _id: "69284f7c0b8a4e59dbc9e902",
    departmentName: "Academic",
    description: "Handles all academic operations including curriculum, teaching, and student performance"
  },
  {
    departmentName: "Admissions",
    description: "Manages student enrollment, counseling, and admission processes"
  },
  {
    departmentName: "Finance",
    description: "Oversees fee collection, payments, scholarships, and financial reporting"
  },
  {
    departmentName: "HR",
    description: "Manages employee recruitment, payroll, attendance, and performance"
  },
  {
    departmentName: "Operations",
    description: "Handles day-to-day operations, infrastructure, and facility management"
  },
  {
    departmentName: "Marketing",
    description: "Manages branding, promotions, lead generation, and student outreach"
  },
  {
    departmentName: "IT",
    description: "Manages technology infrastructure, software systems, and digital platforms"
  }
];

const seedDepartments = async () => {
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

    await Department.deleteMany({}); // Clear existing
    await Department.insertMany(departments);
    
    console.log("Departments seeded successfully!");
    console.log(`Total departments created: ${departments.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding Departments:", error);
    process.exit(1);
  }
};

seedDepartments();
