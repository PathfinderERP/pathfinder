import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import connectDB from "./db/connect.js";

dotenv.config();

const checkUser = async () => {
    try {
        await connectDB();

        console.log("🔍 Checking users...\n");

        // Find all users
        const allUsers = await User.find({});

        console.log("📋 All Users:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        allUsers.forEach(user => {
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Permissions: ${user.permissions.join(", ") || "None"}`);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        });

        // Find SuperAdmins
        const superAdmins = await User.find({ role: "superAdmin" });
        console.log(`\n✅ Found ${superAdmins.length} SuperAdmin(s)`);

        if (superAdmins.length > 0) {
            console.log("\n🔑 SuperAdmin Credentials:");
            superAdmins.forEach(admin => {
                console.log(`  - ${admin.name} (${admin.email})`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

checkUser();
