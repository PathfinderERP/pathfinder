import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";
import CentreSchema from "./models/Master_data/Centre.js";
import connectDB from "./db/connect.js";

dotenv.config();

const seedDemoUsers = async () => {
    try {
        // Connect to database
        await connectDB();

        console.log("🌱 Starting to seed demo users...\n");

        // Get or create a demo centre
        let demoCentre = await CentreSchema.findOne({ enterCode: "DEMO01" });

        if (!demoCentre) {
            console.log("📍 Creating demo centre...");
            demoCentre = new CentreSchema({
                centreName: "Demo Centre",
                enterCode: "DEMO01",
                state: "Delhi",
                email: "demo@pathfinder.com",
                phoneNumber: "1234567890",
                salesPassword: "demo123",
                location: "Demo Location",
                address: "Demo Address, Delhi"
            });
            await demoCentre.save();
            console.log("✅ Demo centre created\n");
        }

        // Hash password for all users
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("pass123", salt);

        // Demo users data
        const demoUsers = [
            {
                name: "Super Admin",
                employeeId: "SA001",
                email: "admin@test.com",
                mobNum: "9999999999",
                password: hashedPassword,
                role: "superAdmin",
                centre: null,
                permissions: []
            },
            {
                name: "John Admin",
                employeeId: "AD001",
                email: "john@test.com",
                mobNum: "9999999998",
                password: hashedPassword,
                role: "admin",
                centre: demoCentre._id,
                permissions: ["CEO Control Tower", "Admissions & Sales", "Finance & Fees", "Master Data", "Course Management"]
            },
            {
                name: "Sarah Teacher",
                employeeId: "TC001",
                email: "sarah@test.com",
                mobNum: "9999999997",
                password: hashedPassword,
                role: "teacher",
                centre: demoCentre._id,
                permissions: ["Academics", "CEO Control Tower"]
            },
            {
                name: "Mike Telecaller",
                employeeId: "TL001",
                email: "mike@test.com",
                mobNum: "9999999996",
                password: hashedPassword,
                role: "telecaller",
                centre: demoCentre._id,
                permissions: ["Admissions & Sales"]
            },
            {
                name: "Emma Counsellor",
                employeeId: "CN001",
                email: "emma@test.com",
                mobNum: "9999999995",
                password: hashedPassword,
                role: "counsellor",
                centre: demoCentre._id,
                permissions: ["Admissions & Sales", "CEO Control Tower"]
            }
        ];

        // Insert users
        for (const userData of demoUsers) {
            const existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                console.log(`⚠️  User ${userData.email} already exists, skipping...`);
                continue;
            }

            const user = new User(userData);
            await user.save();
            console.log(`✅ Created ${userData.role}: ${userData.name} (${userData.email})`);
        }

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎉 Demo users created successfully!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n📋 Login Credentials (All passwords: pass123):");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("1. SuperAdmin:  admin@test.com");
        console.log("2. Admin:       john@test.com");
        console.log("3. Teacher:     sarah@test.com");
        console.log("4. Telecaller:  mike@test.com");
        console.log("5. Counsellor:  emma@test.com");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n⚠️  Please change passwords after first login!");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding demo users:", error);
        process.exit(1);
    }
};

seedDemoUsers();
