import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import LeadManagement from "../models/LeadManagement.js";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const sampleLeads = await LeadManagement.find({}).limit(10).lean();
        console.log("Sample Leads:", JSON.stringify(sampleLeads, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};
run();
