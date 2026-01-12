import mongoose from 'mongoose';
import Employee from '../models/HR/Employee.js';
import CentreSchema from '../models/Master_data/Centre.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const emps = await Employee.find({ name: /Malay Maity/i }).populate('primaryCentre');
        console.log(`Found ${emps.length} records for Malay Maity:`);
        emps.forEach(emp => {
            console.log(`- ID: ${emp.employeeId} | Email: ${emp.email} | Centre: ${emp.primaryCentre?.centreName}`);
        });
        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

verify();
