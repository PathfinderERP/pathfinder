import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas...');
    const db = mongoose.connection.db;

    // 1. Update admissions collection
    const admResult = await db.collection('admissions').updateMany(
        { centre: /^agartala$/i },
        { $set: { centre: "ZAGARTALA" } }
    );
    console.log(`Admissions updated: ${admResult.modifiedCount}`);

    // 2. Update boardcourseadmissions collection
    const bcaResult = await db.collection('boardcourseadmissions').updateMany(
        { centre: /^agartala$/i },
        { $set: { centre: "ZAGARTALA" } }
    );
    console.log(`BoardCourseAdmissions updated: ${bcaResult.modifiedCount}`);

    // 3. Update boardcoursecounsellings collection
    const bccResult = await db.collection('boardcoursecounsellings').updateMany(
        { centre: /^agartala$/i },
        { $set: { centre: "ZAGARTALA" } }
    );
    console.log(`BoardCourseCounsellings updated: ${bccResult.modifiedCount}`);

    // 4. Update payments collection
    const payResult = await db.collection('payments').updateMany(
        { centre: /^agartala$/i },
        { $set: { centre: "ZAGARTALA" } }
    );
    console.log(`Payments updated: ${payResult.modifiedCount}`);

    // 5. Check if any users have "AGARTALA" in their centres array
    const users = await db.collection('users').find({ "centres.centreName": /^agartala$/i }).toArray();
    for (const u of users) {
        let updatedCentres = u.centres.map(c => {
            if (/^agartala$/i.test(c.centreName || '')) {
                return { ...c, centreName: "ZAGARTALA" };
            }
            return c;
        });
        await db.collection('users').updateOne({ _id: u._id }, { $set: { centres: updatedCentres } });
        console.log(`User ${u.username || u.email || u._id} updated centres array`);
    }

    console.log('\nMigration complete!');
    process.exit(0);
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
