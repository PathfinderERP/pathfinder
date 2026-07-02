import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadManagement from './models/LeadManagement.js';

dotenv.config();

async function checkAnwesha() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const leads = await LeadManagement.find({ name: /ANWESHA DHARA/i });
        console.log(`Found ${leads.length} leads matching ANWESHA DHARA`);

        leads.forEach((lead, idx) => {
            console.log(`\n--- Match ${idx + 1} ---`);
            console.log('ID:', lead._id);
            console.log('Name:', lead.name);
            console.log('Root leadType:', lead.leadType);
            console.log('Number of follow-ups:', lead.followUps?.length);
            if (lead.followUps && lead.followUps.length > 0) {
                lead.followUps.forEach((f, i) => {
                    console.log(`  [Follow-up ${i + 1}] Date: ${f.date}, Status (status): ${f.status}, Feedback: ${f.feedback}`);
                });
            }
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAnwesha();
