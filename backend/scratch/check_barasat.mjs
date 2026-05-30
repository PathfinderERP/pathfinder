import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;

    // Find Barasat Centre
    const centres = await db.collection('centreschemas').find({
        centreName: { $regex: /barasat/i }
    }).toArray();

    console.log("Barasat Centre details:", centres);

    if (centres.length === 0) {
        console.log("No centre found matching Barasat.");
        process.exit(0);
    }

    const centreId = centres[0]._id;

    // Find all targets for Barasat Centre
    const targets = await db.collection('centretargets').find({
        centre: centreId
    }).toArray();

    console.log(`Found ${targets.length} targets for Barasat:`);
    targets.forEach(t => {
        console.log(`- Month: ${t.month}, Year: ${t.year}, FinancialYear: ${t.financialYear}, TargetAmount: ${t.targetAmount}, ID: ${t._id}`);
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
