import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import connectDB from '../db/connect.js';

dotenv.config({ path: '.env' });

const reset = async () => {
    try {
        await connectDB();
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('admin123', salt);
        await User.updateOne({ email: 'rohan@pathfinder.edu.in' }, { $set: { password } });
        console.log('Password reset successfully');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

reset();
