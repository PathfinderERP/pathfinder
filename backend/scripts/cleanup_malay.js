import mongoose from 'mongoose';
import Employee from '../models/HR/Employee.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        // Ensure we delete the one with the NEW ID, keeping the old one (which we will update properly)
        // Or actually, delete the NEW one (created by the script) so we can re-run the fixed script against the OLD one.
        const res = await Employee.deleteOne({ employeeId: 'EMP25000397' });
        console.log(`Deleted ${res.deletedCount} duplicates.`);
        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

cleanup();
