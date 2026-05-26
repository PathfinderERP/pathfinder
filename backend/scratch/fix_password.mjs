import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const email = 'mimmahamudul6@gmail.com';
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            await mongoose.disconnect();
            return;
        }

        console.log('Current User Details:');
        console.log(`Name: ${user.name}`);
        console.log(`Employee ID: ${user.employeeId}`);
        console.log(`Email: ${user.email}`);

        // Set password to Employee ID
        const newPassword = user.employeeId; // "EMP26000586"
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        console.log('Password has been updated successfully!');

        // Double check
        const updatedUser = await User.findOne({ email });
        const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
        console.log(`Verification: Does password "${newPassword}" match new hash?`, isMatch);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
