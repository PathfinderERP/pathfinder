import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function checkCenterStaff() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const centerId = "697088baabb4820c05aecdb2";
        const staff = await User.find({ centres: centerId });
        console.log(`Staff at center ${centerId}: ${staff.length}`);
        staff.forEach(s => console.log(`- ${s.name} (${s.role})`));
        await mongoose.disconnect();
    } catch (error) { }
}

checkCenterStaff();
