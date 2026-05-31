import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";
import Centre from "./models/Master_data/Centre.js";

dotenv.config();

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB.");

        const users = await User.find({ name: { $regex: /Priyanka/i } }).populate("centres");
        console.log(`Found ${users.length} matching users:`);

        for (const user of users) {
            console.log("-----------------------------------------");
            console.log("ID:", user._id);
            console.log("Name:", user.name);
            console.log("Email:", user.email);
            console.log("Role:", user.role);
            console.log("IsActive:", user.isActive);
            console.log("Centres:", user.centres.map(c => c.centreName));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

main();
