import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import CentreSchema from './models/Master_data/Centre.js';
import connectDB from './db/connect.js';

dotenv.config();

async function verifyUpdates() {
    try {
        await connectDB();
        console.log('✅ Connected to database\n');

        // Sample verification - check a few users
        const sampleEmails = [
            'argha@pathfinder.edu.in',
            'rajib.k2001@gmail.com',
            'baruipur@pathfinder.edu.in'
        ];

        for (const email of sampleEmails) {
            const user = await User.findOne({ email }).populate('centres');

            if (user) {
                console.log(`\n📋 User: ${user.name} (${user.email})`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Centers: ${user.centres.map(c => c.centreName).join(', ')}`);
                console.log(`   Can Edit Users: ${user.canEditUsers}`);
                console.log(`   Can Delete Users: ${user.canDeleteUsers}`);
                console.log(`   Granular Permissions Modules: ${Object.keys(user.granularPermissions || {}).join(', ')}`);

                // Check if admissions module has full access
                const admissions = user.granularPermissions?.admissions;
                if (admissions) {
                    console.log(`   Admissions Access: ${JSON.stringify(admissions)}`);
                }
            }
        }

        console.log('\n✅ Verification complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifyUpdates();
