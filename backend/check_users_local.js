import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const centerIncharge = await User.findOne({ name: /SUVASHIS BANERJEE/i });
        if (centerIncharge) {
            console.log('\nCenter Incharge:');
            console.log(`Name: ${centerIncharge.name}, Role: ${centerIncharge.role}, Centres: ${JSON.stringify(centerIncharge.centres)}`);

            const centerIds = centerIncharge.centres;
            if (centerIds.length > 0) {
                const staff = await User.find({
                    centres: { $in: centerIds },
                    _id: { $ne: centerIncharge._id }
                });
                console.log(`\nStaff sharing centres with him (${staff.length}):`);
                staff.forEach(s => {
                    console.log(`- ${s.name} (${s.role}) Centers: ${JSON.stringify(s.centres)}`);
                });
            }
        } else {
            console.log('\nUser SUVASHIS BANERJEE not found.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
