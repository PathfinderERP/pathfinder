
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import LeadManagement from './models/LeadManagement.js';
import Course from './models/Master_data/Courses.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const lead = await LeadManagement.findOne({ 
            name: /Rohit Saha/i 
        });
        console.log('LEAD_RESULT:', JSON.stringify(lead, null, 2));

        const course = await Course.findOne({ courseName: 'NEET 2Years 2026-2028' });
        console.log('COURSE_RESULT:', JSON.stringify(course, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
