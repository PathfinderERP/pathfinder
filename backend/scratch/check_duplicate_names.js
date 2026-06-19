import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder");
    console.log("Connected to DB");

    const users = await User.find().select('name role employeeId isActive').lean();
    console.log("Total users:", users.length);

    const nameMap = {};
    users.forEach(u => {
        const name = u.name.toLowerCase();
        if (!nameMap[name]) {
            nameMap[name] = [];
        }
        nameMap[name].push(u);
    });

    console.log("Duplicates:");
    for (const name in nameMap) {
        if (nameMap[name].length > 1) {
            console.log(`Name: "${name}"`);
            nameMap[name].forEach(u => {
                console.log(`  ID: ${u._id}, Role: ${u.role}, EmpId: ${u.employeeId}, Active: ${u.isActive}`);
            });
        }
    }

    await mongoose.disconnect();
};

run().catch(console.error);
