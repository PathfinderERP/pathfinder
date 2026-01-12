import mongoose from 'mongoose';
import Employee from '../models/HR/Employee.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const check = async () => {
    await mongoose.connect(process.env.MONGO_URL);
    const emp = await Employee.findOne({ email: 'arunodaynandy@gmail.com' })
        .populate('manager')
        .populate('primaryCentre')
        .populate('department')
        .populate('designation');

    console.log("Employee:", JSON.stringify(emp, null, 2));

    const user = await User.findOne({ email: 'arunodaynandy@gmail.com' });
    console.log("User employeeId:", user.employeeId);

    mongoose.disconnect();
};

check();
