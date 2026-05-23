import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    process.exit(0);
}

main();
