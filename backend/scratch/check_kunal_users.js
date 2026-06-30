import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import CentreSchema from "../models/Master_data/Centre.js"; // Ensure CentreSchema is registered

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const users = await User.find({ name: /Kunal/i }).populate('centres');
        console.log("All users with Kunal in name:");
        users.forEach(u => {
            console.log({
                _id: u._id,
                name: u.name,
                role: u.role,
                isActive: u.isActive,
                centres: u.centres.map(c => c.centreName)
            });
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
