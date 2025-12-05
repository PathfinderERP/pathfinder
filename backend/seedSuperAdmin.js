import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";
import connectDB from "./db/connect.js";

dotenv.config();

const seedSuperAdmin = async () => {
    try {
        // Connect to database
        await connectDB();

        // Check if SuperAdmin already exists
        const existingSuperAdmin = await User.findOne({ role: "superAdmin" });

        if (existingSuperAdmin) {
            console.log("⚠️  SuperAdmin already exists!");
            console.log("Email:", existingSuperAdmin.email);
            console.log("You can use this account to login.");
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("admin123", salt);

        // Create SuperAdmin user
        const superAdmin = new User({
            name: "Super Admin",
            employeeId: "SA001",
            email: "admin@pathfinder.com",
            mobNum: "9999999999",
            password: hashedPassword,
            role: "superAdmin",
            centre: null, // SuperAdmin is not tied to any centre
            permissions: [] // SuperAdmin has access to everything by default
        });

        await superAdmin.save();

        console.log("✅ SuperAdmin created successfully!");
        console.log("\n📋 Login Credentials:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Email:    admin@pathfinder.com");
        console.log("Password: admin123");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n⚠️  Please change the password after first login!");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding SuperAdmin:", error);
        process.exit(1);
    }
};

seedSuperAdmin();
