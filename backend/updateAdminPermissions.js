import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import connectDB from "./db/connect.js";

dotenv.config();

const updateAdminPermissions = async () => {
    try {
        await connectDB();

        console.log("🔄 Updating admin user permissions...\n");

        // Update John Admin to include Course Management permission
        const johnAdmin = await User.findOne({ email: "john@test.com" });

        if (johnAdmin) {
            if (!johnAdmin.permissions.includes("Course Management")) {
                johnAdmin.permissions.push("Course Management");
                await johnAdmin.save();
                console.log("✅ Updated john@test.com - Added 'Course Management' permission");
            } else {
                console.log("ℹ️  john@test.com already has 'Course Management' permission");
            }
        } else {
            console.log("⚠️  john@test.com not found");
        }

        console.log("\n✅ Permission update complete!");
        console.log("\n📋 Current Permissions for john@test.com:");
        console.log(johnAdmin?.permissions || "User not found");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating permissions:", error);
        process.exit(1);
    }
};

updateAdminPermissions();
