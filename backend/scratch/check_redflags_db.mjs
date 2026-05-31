import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const count = await mongoose.connection.db.collection('redflags').countDocuments({});
    console.log('Total redflags in collection:', count);

    if (count > 0) {
        const sample = await mongoose.connection.db.collection('redflags').findOne({});
        console.log('Sample redflag:', JSON.stringify(sample, null, 2));

        const types = await mongoose.connection.db.collection('redflags').aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray();
        console.log('Types of redflags:', types);
        
        const dates = await mongoose.connection.db.collection('redflags').aggregate([
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: -1 } }
        ]).toArray();
        console.log('Dates of redflags:', dates);
    }
    process.exit(0);
}

main();
