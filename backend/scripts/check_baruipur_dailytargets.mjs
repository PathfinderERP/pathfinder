import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models/Master_data/Centre.js';
import Centre from '../models/Master_data/Centre.js';
import DailyTarget from '../models/Sales/DailyTarget.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const centre = await Centre.findOne({ centreName: { $regex: /baruipur/i } });
        console.log("Baruipur ID:", centre._id);

        const targets = await DailyTarget.find({
            centre: centre._id,
            date: {
                $gte: new Date("2026-09-01T00:00:00.000Z"),
                $lte: new Date("2026-09-30T23:59:59.999Z")
            }
        }).sort({ date: 1 }).lean();

        console.log(`Found ${targets.length} DailyTarget records for Baruipur in September 2026:`);
        let sum = 0;
        targets.forEach(t => {
            const dateStr = t.date ? new Date(t.date).toISOString().slice(0, 10) : 'N/A';
            const dateIST = t.date ? new Date(t.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
            console.log(`  Date: ${dateStr} (${dateIST}) | Target: ${t.targetAmount} | CreatedAt: ${t.createdAt?.toISOString()}`);
            sum += t.targetAmount;
        });

        console.log(`Total Target sum: ${sum}`);

        // Check for 1st Sep to 6th Sep specifically
        const sep1to6 = targets.filter(t => {
            const d = new Date(t.date);
            // check UTC / IST day
            return t.date >= new Date("2026-08-31T18:30:00.000Z") && t.date <= new Date("2026-09-06T18:29:59.999Z");
        });

        console.log(`\nDailyTarget from Sep 1 to Sep 6:`);
        let sum1to6 = 0;
        sep1to6.forEach(t => {
            console.log(`  Date: ${t.date.toISOString()} | IST: ${new Date(t.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | Target: ${t.targetAmount}`);
            sum1to6 += t.targetAmount;
        });
        console.log(`Sum Sep 1-6: ${sum1to6}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
