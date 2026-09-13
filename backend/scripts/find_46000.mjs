import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models/Master_data/Centre.js';
import CentreTarget from '../models/Sales/CentreTarget.js';
import Centre from '../models/Master_data/Centre.js';
import Payment from '../models/Payment/Payment.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const centre = await Centre.findOne({ centreName: { $regex: /baruipur/i } });
        console.log("Centre ID:", centre._id);

        const target = await CentreTarget.findOne({
            centre: centre._id,
            year: 2026,
            month: "September"
        });

        console.log("Target Record:", JSON.stringify(target, null, 2));

        // Let's check DailyCollection or other collections
        // What target calculation yields 46000?
        // Let's test different formulas:
        // Formula A:
        // In FinalWeekendTarget.jsx:
        // What does FinalWeekendTarget do?
        // What does WeeklyTarget do?
        // What does DailyCollection do?
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
