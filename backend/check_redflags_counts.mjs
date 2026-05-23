import connectDB from './db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;

    // Get all flags
    const flags = await db.collection('redflags').find({}).toArray();
    console.log('Total flags in database:', flags.length);

    const counts = {
        resolved: 0,
        unresolved: 0,
        severities: {
            Critical: { resolved: 0, unresolved: 0 },
            High: { resolved: 0, unresolved: 0 },
            Medium: { resolved: 0, unresolved: 0 },
            Low: { resolved: 0, unresolved: 0 }
        }
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

    console.log('Overall Counts:', JSON.stringify(counts, null, 2));
    process.exit(0);
}

main();
