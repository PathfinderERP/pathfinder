import connectDB from '../db/connect.js';
import mongoose from 'mongoose';
import { getRedFlags } from '../controllers/redFlagController.js';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;

    const center = await db.collection('centreschemas').findOne({ centreName: 'HAZRA H.O' });
    const centerId = center._id.toString();

    // Mock Express request/response
    let resultData = null;
    const req = {
        query: {
            centreId: centerId,
            role: 'All Roles',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
        }
    };
    const res = {
        status: (code) => ({
            json: (data) => {
                resultData = data;
            }
        })
    };

    await getRedFlags(req, res);
    
    console.log('Total flags returned:', resultData ? resultData.length : 0);
    if (resultData && resultData.length > 0) {
        console.log('Roles breakdown of returned flags:');
        const roleCounts = {};
        for (const flag of resultData) {
            const role = flag.role;
            const severity = flag.severity;
            const isResolved = flag.isResolved;
            if (!roleCounts[role]) {
                roleCounts[role] = { total: 0, critical: 0, high: 0, medium: 0, low: 0, resolved: 0 };
            }
            roleCounts[role].total++;
            if (isResolved) {
                roleCounts[role].resolved++;
            } else {
                if (severity === 'Critical') roleCounts[role].critical++;
                else if (severity === 'High') roleCounts[role].high++;
                else if (severity === 'Medium') roleCounts[role].medium++;
                else if (severity === 'Low') roleCounts[role].low++;
            }
        }
        console.log(JSON.stringify(roleCounts, null, 2));
    }

    process.exit(0);
}

main();
