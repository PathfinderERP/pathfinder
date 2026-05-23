import connectDB from '../db/connect.js';
import { getRedFlags } from '../controllers/redFlagController.js';

async function main() {
    await connectDB();

    const req = {
        query: {
            role: 'All Roles',
            startDate: '2026-05-12',
            endDate: '2026-05-12'
        }
    };

    const res = {
        status(code) {
            console.log('Response Status:', code);
            return this;
        },
        json(data) {
            console.log('Response JSON length:', data.length);
            if (data.length > 0) {
                console.log('Sample item:', JSON.stringify(data[0], null, 2));
            } else {
                console.log('No data returned.');
            }
        }
    };

    console.log('Simulating getRedFlags handler...');
    await getRedFlags(req, res);
    process.exit(0);
}

main();
