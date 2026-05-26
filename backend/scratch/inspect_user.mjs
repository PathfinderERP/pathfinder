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

        const specialCandidates = [
            'undefined',
            'null',
            '',
            ' ',
            'mimmahamudul6@gmail.com',
            'mahamudul'
        ];

        for (const pwd of specialCandidates) {
            const isMatch = await bcrypt.compare(pwd, user.password);
            if (isMatch) {
                console.log(`>>> MATCH FOUND: Password is "${pwd}"`);
                await mongoose.disconnect();
                return;
            }
        }

        console.log(`Testing Employee IDs from EMP26000500 to EMP26000600...`);
        for (let i = 500; i <= 600; i++) {
            const candidate = `EMP26000${String(i).padStart(3, '0')}`;
            const isMatch = await bcrypt.compare(candidate, user.password);
            if (isMatch) {
                console.log(`>>> MATCH FOUND: Password is "${candidate}"`);
                await mongoose.disconnect();
                return;
            }
        }

        console.log('No matches found.');
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
