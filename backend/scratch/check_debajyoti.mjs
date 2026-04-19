import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/HR/Employee.js';

dotenv.config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const email = 'sarkardebajyoti@gmail.com';
        
        const user = await User.findOne({ email });
        console.log('User found:', user ? {
            _id: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
            employeeId: user.employeeId
        } : 'Not found');

        const employee = await Employee.findOne({ $or: [{ email }, { userId: user?._id }] });
        console.log('Employee found:', employee ? {
            _id: employee._id,
            email: employee.email,
            userId: employee.userId,
            employeeId: employee.employeeId,
            designation: employee.designation
        } : 'Not found');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUser();
