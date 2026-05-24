import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const user = await db.collection('users').findOne({ employeeId: "SA002" });
        if (user) {
            console.log("Raw user.centres:", user.centres);
            console.log("Type of user.centres:", typeof user.centres);
            console.log("IsArray:", Array.isArray(user.centres));
            if (user.centres) {
                console.log("Length:", user.centres.length);
                user.centres.forEach((c, idx) => {
                    console.log(`Index ${idx}:`, c, typeof c);
                });
            }
        } else {
            console.log("User not found");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
