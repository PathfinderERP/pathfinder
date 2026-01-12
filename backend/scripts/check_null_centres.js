import mongoose from 'mongoose';
import Employee from '../models/HR/Employee.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const total = await Employee.countDocuments({});
        const nullCentres = await Employee.countDocuments({ primaryCentre: null });
        console.log(`Total Employees: ${total}`);
        console.log(`Employees with Null Primary Centre: ${nullCentres}`);

        const nullSamples = await Employee.find({ primaryCentre: null }).limit(10);
        nullSamples.forEach(emp => {
            console.log(`Name: ${emp.name}, Email: ${emp.email}`);
        });

        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

check();
