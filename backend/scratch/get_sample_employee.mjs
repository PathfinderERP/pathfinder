import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;

    const sample = await db.collection('employees').findOne({});
    console.log('Sample Employee:', JSON.stringify(sample, null, 2));

    process.exit(0);
}

main();
