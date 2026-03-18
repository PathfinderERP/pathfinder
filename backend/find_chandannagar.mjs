
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import Centre from './models/Master_data/Centre.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const centres = await Centre.find({ centreName: /CHANDANNAGAR/i });
        console.log('CENTRES_FOUND:', JSON.stringify(centres, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
