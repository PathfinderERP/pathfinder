import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const user = await User.findOne({ email: "rohan@pathfinder.edu.in" });
        if (!user) {
            console.log("Rohan user not found");
            await mongoose.disconnect();
            return;
        }

        const passwordsToTest = [
            "SA002",
            "admin123",
            "123456",
            "7003520412",
            "rohan123",
            "password"
        ];

        console.log("Testing Rohan's password hash against common options...");
        let matched = false;
        for (const pwd of passwordsToTest) {
            const isMatch = await bcrypt.compare(pwd, user.password);
            if (isMatch) {
                console.log(`MATCH FOUND! Rohan's password is: "${pwd}"`);
                matched = true;
                break;
            }
        }

        if (!matched) {
            console.log("No match found for Rohan's password. Password hash is:", user.password);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
