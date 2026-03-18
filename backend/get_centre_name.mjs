
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
        const centre = await Centre.findById('697088baabb4820c05aecdb6');
        console.log('CENTRE_NAME:', centre ? centre.centreName : 'Not Found');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
