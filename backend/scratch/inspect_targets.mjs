import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;

    const ids = [
        new mongoose.Types.ObjectId('69fc791591faa4a4882155d7'),
        new mongoose.Types.ObjectId('6a168fd3a0977e794d9a5bb8')
    ];

    const records = await db.collection('centretargets').find({
        _id: { $in: ids }
    }).toArray();

    console.log("Detailed records:");
    records.forEach(r => {
        console.log(JSON.stringify(r, null, 2));
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
