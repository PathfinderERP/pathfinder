import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function checkSpecificUser() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const user = await User.findOne({ name: /SUVASHIS BANERJEE/i });
        if (user) {
            console.log(`User: ${user.name}`);
            console.log(`Centres: ${JSON.stringify(user.centres)}`);

            // Look for a telecaller that should be visible
            const staff = await User.findOne({ role: 'telecaller' });
            if (staff) {
                console.log(`Staff Sample: ${staff.name}`);
                console.log(`Staff Centres: ${JSON.stringify(staff.centres)}`);

                const overlap = user.centres.filter(c => staff.centres.map(sc => sc.toString()).includes(c.toString()));
                console.log(`Overlap: ${JSON.stringify(overlap)}`);
            }
        }
        await mongoose.disconnect();
    } catch (error) { }
}

checkSpecificUser();
