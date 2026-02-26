import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';

dotenv.config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const users = await User.find({ role: { $in: ['telecaller', 'counsellor', 'marketing', 'centerIncharge'] } }).limit(20);
        console.log('Sample Users:');
        users.forEach(u => {
            console.log(`Name: ${u.name}, Role: ${u.role}, Centres: ${JSON.stringify(u.centres)}`);
        });

        const centerIncharge = await User.findOne({ role: 'centerIncharge' });
        if (centerIncharge) {
            console.log('\nCenter Incharge Example:');
            console.log(`Name: ${centerIncharge.name}, Centres: ${JSON.stringify(centerIncharge.centres)}`);

            const sharedCentresUsers = await User.find({
                centres: { $in: centerIncharge.centres },
                role: { $in: ['telecaller', 'counsellor', 'marketing'] }
            });
            console.log(`\nUsers sharing centres with ${centerIncharge.name}: ${sharedCentresUsers.length}`);
            sharedCentresUsers.forEach(u => {
                console.log(`- ${u.name} (${u.role})`);
            });
        } else {
            console.log('\nNo centerIncharge found.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
