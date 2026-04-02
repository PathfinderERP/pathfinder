import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Centre from './backend/models/Master_data/Centre.js';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URL);
    const centres = await Centre.find({}, 'centreName enterCode');
    console.log(JSON.stringify(centres, null, 2));
    await mongoose.disconnect();
}

check();
