import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function checkCollections() {
    try {
        const uri = process.env.MONGO_URL;
        console.log("Connecting to:", uri);
        await mongoose.connect(uri);
        console.log("Connected to MongoDB successfully");

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("Available Collections:");
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error during check:", error);
    }
}

checkCollections();
