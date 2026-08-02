import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import CentreSchema from '../models/Master_data/Centre.js';

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const user = await User.findById('69d4f49d040571d75fc5f3f0');
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('Found user:', user._id, user.name, user.role, 'teacherType:', user.teacherType);

        // Test populate
        await user.populate([
            { path: "centres", select: "centreName enterCode" },
            { path: "createdBy", select: "name" },
            { path: "updatedBy", select: "name" },
            { path: "deactivatedBy", select: "name" }
        ]);
        console.log('Populate successful!');

        // Test validation and save
        await user.validate();
        console.log('Validation successful!');

        await user.save();
        console.log('User save successful!');

    } catch (err) {
        console.error('Test error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
