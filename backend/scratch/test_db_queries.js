import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/HR/Employee.js';
import DailyTrackingLog from '../models/DailyTrackingLog.js';

dotenv.config();
const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        // Try querying users
        console.log("Querying users...");
        const userQuery = { isActive: true };
        const users = await User.find(userQuery).select("name role designation profileImage centres centre");
        console.log(`Found ${users.length} active users.`);

        // Try querying employees
        console.log("Querying employees...");
        const employeesForUsers = await Employee.find({
            user: { $in: users.map(u => u._id) }
        }).populate("primaryCentre", "centreName");
        console.log(`Found ${employeesForUsers.length} employees.`);

        // Try querying logs
        console.log("Querying daily tracking logs...");
        const targetDate = new Date("2026-06-05T00:00:00.000Z");
        const startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
        const endRange = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);
        const logQuery = { 
            date: { $gte: startRange, $lt: endRange },
            user: { $in: users.map(u => u._id) }
        };
        const logs = await DailyTrackingLog.find(logQuery)
            .populate("user", "name role designation profileImage");
        console.log(`Found ${logs.length} logs for the date.`);

        await mongoose.disconnect();
        console.log("Disconnected successfully");
    } catch (e) {
        console.error("Query failed:", e);
    }
}

run();
