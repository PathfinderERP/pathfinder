// backend/seed/classes.js
import mongoose from "mongoose";
import Class from "../models/Master_data/Class.js";
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

const classes = [
  { _id: "6928440a7faf6960111c4f7c", name: "Class 10" },
  { _id: "6928440d7faf6960111c4f7f", name: "Class 11" },
  { _id: "692844137faf6960111c4f82", name: "Class 12" }
];

const seedClasses = async () => {
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

    await Class.deleteMany({}); // Clear existing
    await Class.insertMany(classes);
    
    console.log("Classes seeded successfully!");
    console.log(`Total classes created: ${classes.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding Classes:", error);
    process.exit(1);
  }
};

seedClasses();
