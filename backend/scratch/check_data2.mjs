import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from '../models/Master_data/Department.js';
import Designation from '../models/Master_data/Designation.js';
import Employee from '../models/HR/Employee.js';

dotenv.config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // All departments
        const departments = await Department.find({}).lean();
        console.log('All Departments:', departments.map(d => ({ id: d._id, name: d.departmentName })));

        // Find a teacher employee (without populate to avoid schema errors)
        const teacherEmployee = await Employee.findOne({}).lean();
        console.log('\nSample Employee keys:', Object.keys(teacherEmployee || {}));
        console.log('Sample Employee:', JSON.stringify({
            employeeId: teacherEmployee?.employeeId,
            name: teacherEmployee?.name,
            email: teacherEmployee?.email,
            designation: teacherEmployee?.designation,
            department: teacherEmployee?.department,
            user: teacherEmployee?.user,
            status: teacherEmployee?.status,
        }, null, 2));

        // Count all employees
        const count = await Employee.countDocuments();
        console.log('\nTotal employees:', count);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
