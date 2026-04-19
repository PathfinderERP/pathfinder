import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/HR/Employee.js';

dotenv.config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const employee = await Employee.findOne({ email: 'sarkardebajyoti@gmail.com' }).lean();
        
        if (employee) {
            console.log('✅ Employee profile found:');
            console.log('Employee ID:', employee.employeeId);
            console.log('Name:', employee.name);
            console.log('Email:', employee.email);
            console.log('User linked (_id):', employee.user);
            console.log('Department:', employee.department);
            console.log('Designation:', employee.designation);
            console.log('Status:', employee.status);
            console.log('Created At:', employee.createdAt);
        } else {
            console.log('❌ Employee not found!');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

verify();
