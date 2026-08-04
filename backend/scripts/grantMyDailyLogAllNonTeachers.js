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

        // Find all users
        const allUsers = await User.find({});
        console.log(`Found ${allUsers.length} total users in database.`);

        let updatedCount = 0;
        let skippedTeacherCount = 0;

        for (const user of allUsers) {
            const isTeacher = user.role && user.role.toLowerCase() === 'teacher';
            if (isTeacher) {
                skippedTeacherCount++;
                continue;
            }

            if (!user.granularPermissions) {
                user.granularPermissions = {};
            }

            if (!user.granularPermissions.dailyTrackingLog) {
                user.granularPermissions.dailyTrackingLog = {};
            }

            user.granularPermissions.dailyTrackingLog.myDailyLog = {
                create: true,
                edit: true,
                delete: true
            };

            user.markModified('granularPermissions');
            await user.save();
            updatedCount++;
        }

        console.log(`Successfully updated ${updatedCount} non-teacher users with My Daily Log permissions!`);
        console.log(`Skipped ${skippedTeacherCount} teacher users.`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

run();
