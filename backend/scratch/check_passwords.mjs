import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Total users in system: ${users.length}`);

        // Find users with the same password hash
        const hashGroups = {};
        for (const user of users) {
            if (!hashGroups[user.password]) {
                hashGroups[user.password] = [];
            }
            hashGroups[user.password].push({
                email: user.email,
                employeeId: user.employeeId,
                name: user.name
            });
        }

        console.log('\n--- Grouping by Password Hash ---');
        for (const [hash, group] of Object.entries(hashGroups)) {
            if (group.length > 1) {
                console.log(`Hash ${hash} is shared by ${group.length} users:`);
                console.log(group.map(g => `${g.name} (${g.email}) - ${g.employeeId}`));
            }
        }

        // Check if mimmahamudul6@gmail.com's hash is shared
        const target = users.find(u => u.email === 'mimmahamudul6@gmail.com');
        if (target) {
            console.log(`\nTarget user mimmahamudul6@gmail.com has hash: ${target.password}`);
            const shared = hashGroups[target.password] || [];
            console.log(`It is shared with ${shared.length} users total.`);
            if (shared.length > 1) {
                console.log('Shared users details:', shared);
            }
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
