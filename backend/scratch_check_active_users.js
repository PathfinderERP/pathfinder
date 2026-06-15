import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config({ path: './.env' });

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
        console.log("Connected to MongoDB successfully");

        const allUsers = await User.find({});
        console.log(`Total Users in DB: ${allUsers.length}`);

        const usersWithIsActiveTrue = await User.countDocuments({ isActive: true });
        const usersWithIsActiveFalse = await User.countDocuments({ isActive: false });
        const usersWithIsActiveMissing = await User.countDocuments({ isActive: { $exists: false } });

        console.log(`Explicit isActive true: ${usersWithIsActiveTrue}`);
        console.log(`Explicit isActive false: ${usersWithIsActiveFalse}`);
        console.log(`Missing isActive field: ${usersWithIsActiveMissing}`);

        // Let's check if the missing isActive users have dailyTrackingLog set
        const missingFieldUsers = await User.find({ isActive: { $exists: false } });
        console.log(`Checking missing isActive users:`);
        missingFieldUsers.forEach(u => {
            console.log(`- ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, dailyTrackingLog: ${JSON.stringify(u.granularPermissions?.dailyTrackingLog || null)}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error running script:", err);
    }
}

run();
