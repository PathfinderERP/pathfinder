import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import connectDB from "./db/connect.js";

dotenv.config();

const updateAdminPntsePermissions = async () => {
    try {
        await connectDB();
        console.log("✅ Connected to database");

        // Find all users with role 'admin' or 'superAdmin'
        const admins = await User.find({
            role: { $in: ["admin", "superAdmin", "Super Admin"] }
        });

        console.log(`🔄 Found ${admins.length} administrative users. Updating PNTSE permissions...`);

        let updatedCount = 0;
        for (const admin of admins) {
            if (!admin.granularPermissions) {
                admin.granularPermissions = {};
            }

            // Grant full PNTSE access
            admin.granularPermissions.pntse = {
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

            // Update directly bypassing Mongoose validation
            await User.updateOne(
                { _id: admin._id },
                { $set: { granularPermissions: admin.granularPermissions } }
            );
            updatedCount++;
        }

        console.log(`\n✅ Successfully updated PNTSE granular permissions for ${updatedCount} admins!`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating PNTSE permissions:", error);
        process.exit(1);
    }
};

updateAdminPntsePermissions();
