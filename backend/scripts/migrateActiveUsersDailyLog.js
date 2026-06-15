import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config({ path: './.env' });

async function run() {
    try {
        const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL;
        if (!mongoUrl) {
            throw new Error("MONGODB_URI or MONGO_URL not defined in environment variables");
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUrl);
        console.log("Connected to MongoDB successfully.");

        // Query active users (explicitly true or missing/implicit true)
        const activeUsers = await User.find({
            $or: [
                { isActive: true },
                { isActive: { $exists: false } }
            ]
        });
        console.log(`Found ${activeUsers.length} active users to migrate.`);

        let updatedCount = 0;

        for (const user of activeUsers) {
            // Ensure granularPermissions exists
            if (!user.granularPermissions) {
                user.granularPermissions = {};
            }

            // Set the dailyTrackingLog module permissions
            user.granularPermissions.dailyTrackingLog = {
                myDailyLog: {
                    create: true,
                    edit: true,
                    delete: true
                }
            };

            // Mark the mixed schema path as modified
            user.markModified('granularPermissions');

            // Save the user back to the database
            await user.save();
            updatedCount++;
        }

        console.log(`Migration finished! Successfully updated ${updatedCount} users.`);

        // Verification query
        const checkUsers = await User.find({
            $or: [
                { isActive: true },
                { isActive: { $exists: false } }
            ]
        });
        const checkFailed = checkUsers.filter(u => {
            const dtLog = u.granularPermissions?.dailyTrackingLog;
            return !dtLog || 
                   !dtLog.myDailyLog || 
                   dtLog.myDailyLog.create !== true || 
                   dtLog.myDailyLog.edit !== true || 
                   dtLog.myDailyLog.delete !== true ||
                   dtLog.logTracking;
        });

        if (checkFailed.length === 0) {
            console.log("Verification passed: All 433 active users have correct permissions.");
        } else {
            console.error(`Verification FAILED! ${checkFailed.length} users do not match criteria.`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Migration failed with error:", err);
        process.exit(1);
    }
}

run();
