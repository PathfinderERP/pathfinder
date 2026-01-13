import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { performAutoCheckout } from '../services/attendanceAutoCheckout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const runFix = async () => {
    try {
        console.log("Connecting to DB...");
        const uri = process.env.MONGO_URL; // Assuming standard naming
        if (!uri) throw new Error("No Mongo URI found in environment variables");

        await mongoose.connect(uri);
        console.log("DB Connected.");

        console.log("Running performAutoCheckout...");
        const count = await performAutoCheckout();
        console.log(`Finished. Processed ${count} records.`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
        console.log("DB Disconnected.");
    }
};

runFix();
