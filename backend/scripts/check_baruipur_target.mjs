import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models/Master_data/Centre.js';
import CentreTarget from '../models/Sales/CentreTarget.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const mainDb = mongoose.connection.client.db("PATHFINDER_NEW");
        const centres = await mainDb.collection("centreschemas").find({
            $or: [
                { centreName: { $regex: /baruipur/i } },
                { name: { $regex: /baruipur/i } }
            ]
        }).toArray();

        console.log("Found Baruipur centre(s):", centres.map(c => ({ _id: c._id, name: c.centreName || c.name })));

        if (centres.length > 0) {
            const centreIds = centres.map(c => c._id);
            const targets = await CentreTarget.find({
                centre: { $in: centreIds },
                month: { $regex: /september/i }
            }).populate('centre', 'centreName name').lean();

            console.log(`\nFound ${targets.length} targets for September:`);
            console.log(JSON.stringify(targets, null, 2));

            const allTargets = await CentreTarget.find({
                centre: { $in: centreIds }
            }).sort({ createdAt: -1 }).limit(5).lean();
            console.log(`\nAll recent targets for Baruipur (${allTargets.length}):`);
            allTargets.forEach(t => {
                console.log(`Month: ${t.month} | Year: ${t.year} | Target: ${t.targetAmount} | WeeklyOverride:`, JSON.stringify(t.weeklyTargetsOverride));
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
