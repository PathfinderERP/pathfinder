import mongoose from 'mongoose';
import Centre from '../models/Master_data/Centre.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const c = await Centre.findOne({ centreName: 'BARUIPUR' });
        console.log('Baruipur Coords:', c?.latitude, c?.longitude);
        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

check();
