import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const centres = await db.collection('centreschemas').find({}).toArray();
        console.log("All Centres in centreschemas:");
        console.log(JSON.stringify(centres.map(c => ({ name: c.centreName, id: c._id })), null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
