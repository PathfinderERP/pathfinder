import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function checkCollections() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkCollections();
