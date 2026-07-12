import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

const mongoURI = process.env.MONGO_URL;
console.log('Connecting to', mongoURI);

mongoose.connect(mongoURI).then(async () => {
    console.log('Connected!');
    const Zone = mongoose.model('Zone', new mongoose.Schema({
        name: String,
        centres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CentreSchema' }]
    }));
    const zones = await Zone.find().lean();
    console.log('Zones:', JSON.stringify(zones, null, 2));
    mongoose.disconnect();
}).catch(console.error);
