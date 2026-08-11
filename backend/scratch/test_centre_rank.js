import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { getCentreRankings } from '../controllers/sales/centreRankController.js';

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const modes = [
            { name: "Monthly", query: { viewMode: "Monthly", year: "2026", month: "August" } },
            { name: "Quarterly", query: { viewMode: "Quarterly", financialYear: "2026-2027", quarter: "Q2" } },
            { name: "Yearly", query: { viewMode: "Yearly", financialYear: "2026-2027" } },
            { name: "Custom", query: { viewMode: "Custom", startDate: "2026-08-01", endDate: "2026-08-11" } }
        ];

        for (const mode of modes) {
            const req = { query: mode.query, user: { role: "superAdmin", centres: [] } };
            let count = 0;
            const res = {
                status: function() { return this; },
                json: function(data) {
                    count = data.rankings ? data.rankings.length : 0;
                }
            };
            await getCentreRankings(req, res);
            console.log(`[${mode.name}] Rankings count:`, count);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
