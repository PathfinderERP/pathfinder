import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        const query = {
            role: { $nin: ['superadmin', 'super admin', 'superAdmin', 'SuperAdmin', 'Super Admin'] },
            $or: [
                { "granularPermissions.taskWorkflow": { $exists: true } },
                { permissions: { $in: ["Task Workflow", "taskWorkflow"] } }
            ]
        };

        const targetUsers = await User.find(query);
        console.log(`Non-superadmin users with Task Workflow permissions to update: ${targetUsers.length}`);

        if (targetUsers.length > 0) {
            console.log("\nUsers list:");
            targetUsers.forEach(u => {
                console.log(`- ${u.name} (Email: ${u.email}, Role: ${u.role})`);
            });

            console.log("\nUpdating users in database...");
            const updateResult = await User.updateMany(
                { role: { $nin: ['superadmin', 'super admin', 'superAdmin', 'SuperAdmin', 'Super Admin'] } },
                {
                    $unset: { "granularPermissions.taskWorkflow": "" },
                    $pull: { permissions: { $in: ["Task Workflow", "taskWorkflow"] } }
                }
            );

            console.log(`Successfully updated ${updateResult.modifiedCount} records.`);
        } else {
            console.log("No non-superadmin users found with Task Workflow permissions.");
        }

        console.log("\n=== POST-UPDATE VERIFICATION ===");
        const verifiedUsers = await User.find(query);
        console.log(`Non-superadmins remaining with Task Workflow permissions: ${verifiedUsers.length}`);

        console.log("\nExecution completed successfully.");

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
