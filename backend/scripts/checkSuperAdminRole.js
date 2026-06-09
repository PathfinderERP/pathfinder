import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected!");

        const users = await User.find({
            $or: [
                { role: /super/i },
                { role: /admin/i }
            ]
        }).select("name email role granularPermissions").lean();

        console.log("Found users:");
        users.forEach(u => {
            console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${JSON.stringify(u.role)}, Has granularPermissions: ${!!u.granularPermissions}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
