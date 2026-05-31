import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const centres = await db.collection('centreschemas').find({}).toArray();
        const content = centres.map(c => `${c.centreName} | ID: ${c._id}`).join("\n");
        fs.writeFileSync('scratch/centres.txt', content);
        console.log("Wrote " + centres.length + " centres to scratch/centres.txt");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
