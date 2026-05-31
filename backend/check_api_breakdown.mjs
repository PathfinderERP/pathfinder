import axios from 'axios';
import dotenv from 'dotenv';
import connectDB from './db/connect.js';
import mongoose from 'mongoose';

dotenv.config();

const port = process.env.PORT || 5000;
const loginUrl = `http://localhost:${port}/api/superAdmin/login`;
const redFlagsUrl = `http://localhost:${port}/api/red-flags`;

async function main() {
    try {
        await connectDB();
        const db = mongoose.connection.db;

        // Get active centers
        const centers = await db.collection('centreschemas').find({ status: { $ne: 'deactive' } }).toArray();
        const activeCenterIds = new Set(centers.map(c => c._id.toString()));
        console.log('Active Center IDs count:', activeCenterIds.size);

        const loginRes = await axios.post(loginUrl, {
            email: 'mimmahamudul6@gmail.com',
            password: 'EMP26000586'
        });
        const token = loginRes.data.token;

        const res = await axios.get(redFlagsUrl, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                role: 'All Roles',
                startDate: '2026-05-12',
                endDate: '2026-05-12'
            }
        });

        const allFlags = res.data;
        console.log('Total flags from API:', allFlags.length);

        // Filter flags by active centers
        const flags = allFlags.filter(f => {
            const cId = f.centre?._id || f.centre;
            return cId && activeCenterIds.has(cId.toString());
        });
        console.log('Flags for active centers:', flags.length);

        const counts = {
            resolved: 0,
            unresolved: 0,
            severities: {}
        };

        for (const f of flags) {
            const isResolved = f.isResolved || false;
            const severity = f.severity || 'Low';

            if (isResolved) {
                counts.resolved++;
            } else {
                counts.unresolved++;
            }

            if (!counts.severities[severity]) {
                counts.severities[severity] = { resolved: 0, unresolved: 0 };
            }

            if (isResolved) {
                counts.severities[severity].resolved++;
            } else {
                counts.severities[severity].unresolved++;
            }
        }

        console.log('Active Center Flags Breakdown:', JSON.stringify(counts, null, 2));

    } catch (err) {
        console.error('Failed:', err.message);
    }
    process.exit(0);
}

main();
