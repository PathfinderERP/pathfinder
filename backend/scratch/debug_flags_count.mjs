import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;
    
    const center = await db.collection('centreschemas').findOne({ centreName: 'HAZRA H.O' });
    const centerId = center._id;

    const list = await db.collection('redflags').find({ centre: centerId }).toArray();
    console.log('Total persistent flags:', list.length);
    console.log('Roles in persistent flags:', list.map(f => ({ name: f.user, role: f.role, severity: f.severity, isResolved: f.isResolved })));

    // Let's run the actual getRedFlags logic (from redFlagController.js) to see what virtual/persistent flags it yields for Hazra H.O.
    // Let's simulate the controller logic.
    process.exit(0);
}

main();
