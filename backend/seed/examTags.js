// backend/seed/examTags.js
import mongoose from "mongoose";
import ExamTag from "../models/Master_data/ExamTag.js";
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

const examTags = [
  { _id: "69284cd279ab9d40b14e3cec", name: "JEE Main" },
  { name: "JEE Advanced" },
  { _id: "69284cd279ab9d40b14e3cee", name: "NEET" },
  { name: "WBJEE" },
  { _id: "69284cd279ab9d40b14e3cf0", name: "Class 10 Board" },
  { name: "Class 12 Board" },
  { name: "KVPY" },
  { name: "Olympiad" },
  { name: "BITSAT" },
  { name: "VITEEE" }
];

const seedExamTags = async () => {
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

    await ExamTag.deleteMany({}); // Clear existing
    await ExamTag.insertMany(examTags);
    
    console.log("ExamTags seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding ExamTags:", error);
    process.exit(1);
  }
};

seedExamTags();