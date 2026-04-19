import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Designation from '../models/Master_data/Designation.js';
import Department from '../models/Master_data/Department.js';

dotenv.config();

async function checkMasters() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const designations = await Designation.find({ name: /teacher/i });
        console.log('Designations:', designations.map(d => ({ id: d._id, name: d.name })));

        const departments = await Department.find({ name: /academic|foundation|board/i });
        console.log('Departments:', departments.map(d => ({ id: d._id, name: d.name })));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkMasters();
