import mongoose from 'mongoose';
import connectDB from '../db/connect.js';
import User from '../models/User.js';

async function main() {
    await connectDB();
    console.log("Connected to database successfully!");

    const activeEmployees = await User.find({
        isActive: true,
        role: { $ne: "teacher" }
    })
    .select("name role isActive")
    .sort({ name: 1 })
    .lean();

    console.log(`Found ${activeEmployees.length} active employees (excluding teachers):`);
    activeEmployees.slice(0, 10).forEach(e => {
        console.log(`- ${e.name} (${e.role})`);
    });
    if (activeEmployees.length > 10) {
        console.log(`... and ${activeEmployees.length - 10} more`);
    }

    process.exit(0);
}

main();
