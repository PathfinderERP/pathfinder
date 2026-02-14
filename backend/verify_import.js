import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadManagement from './models/LeadManagement.js';

dotenv.config();

const verifyDistribution = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        const stats = await LeadManagement.aggregate([
            { $match: { source: 'Bulk Import' } },
            { $group: { _id: '$leadResponsibility', count: { $sum: 1 } } }
        ]);

        console.log('--- LEAD DISTRIBUTION STATS ---');
        console.log(JSON.stringify(stats, null, 2));

        const sample = await LeadManagement.findOne({ source: 'Bulk Import' }).populate('board centre className');
        console.log('\n--- SAMPLE IMPORTED LEAD ---');
        console.log(JSON.stringify(sample, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

verifyDistribution();
