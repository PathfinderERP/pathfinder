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

        console.log("🌱 Starting SuperAdmin seed...\n");

        // Check if SuperAdmin already exists
        // const existingSuperAdmin = await User.findOne({ role: "superAdmin" });

        // if (existingSuperAdmin) {
        //     console.log("⚠️  SuperAdmin already exists!");
        //     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        //     console.log("Name:     ", existingSuperAdmin.name);
        //     console.log("Email:    ", existingSuperAdmin.email);
        //     console.log("Employee: ", existingSuperAdmin.employeeId);
        //     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        //     console.log("\n✅ You can use this account to login.");
        //     console.log("📧 Email:    ", existingSuperAdmin.email);
        //     console.log("🔑 Password: (the one you set when creating it)");
        //     console.log("\n💡 If you forgot the password, delete this user from MongoDB and run this script again.\n");
        //     process.exit(0);
        // }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("admin123", salt);

        // Create SuperAdmin user with current schema
        const superAdmin = new User({
            name: "Super Admin",
            employeeId: "SA002",
            email: "admin1@pathfinder.com",
            mobNum: "9999999999",
            password: hashedPassword,
            role: "superAdmin",
            centres: [], // SuperAdmin is not tied to any specific centres
            permissions: [], // Legacy field - SuperAdmin has access to everything by default
            granularPermissions: {}, // SuperAdmin doesn't need granular permissions (auto-granted)
            canEditUsers: true, // SuperAdmin can edit users
            canDeleteUsers: true // SuperAdmin can delete users
        });

        await superAdmin.save();

        console.log("✅ SuperAdmin created successfully!\n");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎉 SUPERADMIN ACCOUNT CREATED");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n📋 Login Credentials:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📧 Email:        admin@pathfinder.com");
        console.log("🔑 Password:     admin123");
        console.log("👤 Employee ID:  SA001");
        console.log("📱 Mobile:       9999999999");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n🔐 Permissions:");
        console.log("   ✅ Full access to ALL modules");
        console.log("   ✅ Can create, edit, and delete users");
        console.log("   ✅ Can assign granular permissions to other users");
        console.log("   ✅ Can create other SuperAdmins");
        console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
        console.log("   🔒 Change this password after first login!");
        console.log("   🔒 Never use this password in production!");
        console.log("   🔒 This is for development/testing only!");
        console.log("\n🚀 Next Steps:");
        console.log("   1. Login with the credentials above");
        console.log("   2. Go to User Management");
        console.log("   3. Create additional users with granular permissions");
        console.log("   4. Test the permission system");
        console.log("   5. Change the SuperAdmin password\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding SuperAdmin:", error);
        console.error("\n🔍 Troubleshooting:");
        console.error("   1. Check MongoDB connection in .env file");
        console.error("   2. Ensure MongoDB is running");
        console.error("   3. Verify User model exists at ./models/User.js");
        console.error("   4. Check for any validation errors above\n");
        process.exit(1);
    }
};

seedSuperAdmin();
