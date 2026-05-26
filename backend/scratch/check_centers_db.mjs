import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;
    const count = await db.collection('centreschemas').countDocuments({});
    console.log('Total centreschemas:', count);

    if (count > 0) {
        const list = await db.collection('centreschemas').find({}).toArray();
        const statuses = list.map(c => ({ name: c.centreName, status: c.status }));
        console.log('Statuses count:', statuses.length);
        console.log('First 5 statuses:', statuses.slice(0, 5));
        
        // Count unique status values
        const statusGroups = {};
        for (const s of statuses) {
            statusGroups[s.status] = (statusGroups[s.status] || 0) + 1;
        }
        console.log('Status breakdown:', statusGroups);
    }
    process.exit(0);
}

main();
