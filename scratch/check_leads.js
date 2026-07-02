import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadManagement from '../backend/models/LeadManagement.js';

dotenv.config();

async function checkLeads() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const totalLeads = await LeadManagement.countDocuments();
        console.log(`Total Leads in Database: ${totalLeads}`);

        const sampleLeads = await LeadManagement.find().limit(5).lean();
        console.log('\nSample Leads:');
        console.log(JSON.stringify(sampleLeads, null, 2));

        // Follow ups stats
        const followUpsStats = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            {
                $group: {
                    _id: null,
                    totalFollowUps: { $sum: 1 },
                    withCallDuration: {
                        $sum: {
                            $cond: [{ $ifNull: ["$followUps.callDuration", false] }, 1, 0]
                        }
                    }
                }
            }
        ]);
        console.log('\nFollow Ups Stats:', followUpsStats);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLeads();
