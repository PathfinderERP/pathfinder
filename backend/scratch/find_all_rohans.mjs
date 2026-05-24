import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const users = await db.collection('users').find({
            $or: [
                { name: /rohan/i },
                { email: /rohan/i },
                { employeeId: /SA002|SA002/i }
            ]
        }).toArray();

        console.log(`Found ${users.length} users:`);
        users.forEach((u, i) => {
            console.log(`\nUser ${i + 1}:`);
            console.log({
                _id: u._id,
                name: u.name,
                email: u.email,
                employeeId: u.employeeId,
                role: u.role,
                centres: u.centres,
                isActive: u.isActive
            });
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
