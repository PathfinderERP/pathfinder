import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        const admins = await User.find({ role: 'admin' });
        console.log(`\nFound total admins: ${admins.length}`);

        let adminsWithGranularMarketingCRM = 0;
        let adminsWithLegacyMarketingCRM = 0;

        admins.forEach(admin => {
            const hasGranular = admin.granularPermissions && admin.granularPermissions.marketingCRM;
            const hasLegacy = admin.permissions && (admin.permissions.includes("Marketing & CRM") || admin.permissions.includes("marketingCRM"));

            if (hasGranular) {
                adminsWithGranularMarketingCRM++;
            }
            if (hasLegacy) {
                adminsWithLegacyMarketingCRM++;
            }

            if (hasGranular || hasLegacy) {
                console.log(`- Admin User: ${admin.name} (Email: ${admin.email})`);
                if (hasGranular) {
                    console.log(`  Granular permissions marketingCRM:`, JSON.stringify(admin.granularPermissions.marketingCRM));
                }
                if (hasLegacy) {
                    console.log(`  Legacy permissions:`, admin.permissions);
                }
            }
        });

        console.log(`\n=== Verification Summary ===`);
        console.log(`- Admins with granular 'marketingCRM': ${adminsWithGranularMarketingCRM}`);
        console.log(`- Admins with legacy 'Marketing & CRM': ${adminsWithLegacyMarketingCRM}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
