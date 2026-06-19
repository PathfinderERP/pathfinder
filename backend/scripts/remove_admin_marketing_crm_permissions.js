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
            role: 'admin',
            $or: [
                { "granularPermissions.marketingCRM": { $exists: true } },
                { permissions: { $in: ["Marketing & CRM", "marketingCRM"] } }
            ]
        };

        const targetUsers = await User.find(query);
        console.log(`Admins with Marketing & CRM permissions to update: ${targetUsers.length}`);

        if (targetUsers.length > 0) {
            console.log("\nUsers list:");
            targetUsers.forEach(u => {
                console.log(`- ${u.name} (Email: ${u.email})`);
            });

            console.log("\nUpdating users in database...");
            const updateResult = await User.updateMany(
                { role: 'admin' },
                {
                    $unset: { "granularPermissions.marketingCRM": "" },
                    $pull: { permissions: { $in: ["Marketing & CRM", "marketingCRM"] } }
                }
            );

            console.log(`Successfully updated ${updateResult.modifiedCount} records.`);
        } else {
            console.log("No admins found with Marketing & CRM permissions.");
        }

        console.log("\n=== POST-UPDATE VERIFICATION ===");
        const verifiedUsers = await User.find(query);
        console.log(`Admins remaining with Marketing & CRM permissions: ${verifiedUsers.length}`);

        console.log("\nExecution completed successfully.");

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
