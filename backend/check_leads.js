import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadManagement from './models/LeadManagement.js';

dotenv.config();

const checkLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const leads = await LeadManagement.find().limit(5).lean();
        console.log(JSON.stringify(leads, null, 2));
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkLeads();
