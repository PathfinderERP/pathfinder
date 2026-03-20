import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Centre from './models/Master_data/Centre.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function checkResources() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        const centre = await Centre.findOne({ centreName: /BALLY/i });
        console.log("Bally Centre:", centre ? `${centre.centreName} | enterCode: ${centre.enterCode} | ID: ${centre._id}` : "Not found");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkResources();
