import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const desigs = await db.collection('designations').find({
            name: { $regex: /director|founder|super|admin|president|manager|ceo/i }
        }).toArray();
        const content = desigs.map(d => `${d.name} | ID: ${d._id}`).join("\n");
        fs.writeFileSync('scratch/designations.txt', content);
        console.log("Wrote " + desigs.length + " designations to scratch/designations.txt");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
