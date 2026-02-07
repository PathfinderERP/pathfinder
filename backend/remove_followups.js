import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadManagement from './models/LeadManagement.js';

dotenv.config();

const removeFollowUps = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const result = await LeadManagement.updateMany(
            { source: 'Bulk Import' },
            { $set: { followUps: [] } }
        );

        console.log(`✅ Successfully removed follow-ups from ${result.modifiedCount} leads.`);

        await mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error:', err);
    }
};

removeFollowUps();
