
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import CentreSchema from './models/Master_data/Centre.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const centres = await CentreSchema.find({}, 'centreName');
        console.log(JSON.stringify(centres, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
run();
