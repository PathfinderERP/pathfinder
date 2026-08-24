import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import connectDB from "./db/connect.js";

dotenv.config();

const updateAdminPmoPermissions = async () => {
    try {
        await connectDB();
        console.log("✅ Connected to database");

        const pmoPermissionObj = {
            allStudents: {
                view: true,
                create: true,
                edit: true,
                delete: true,
                import: true,
                export: true
            },
            addStudent: {
                view: true,
                create: true,
                edit: true,
                delete: true
            }
        };

        const res = await User.updateMany(
            {},
            { $set: { "granularPermissions.pmo": pmoPermissionObj } }
        );

        console.log(`\n✅ Successfully updated PMO granular permissions for ${res.modifiedCount} users!`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating PMO permissions:", error);
        process.exit(1);
    }
};

updateAdminPmoPermissions();
