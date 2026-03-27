import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URL);
const Centre = (await import('./models/Master_data/Centre.js')).default;

// HAZRA H.O -> 0096195615 (already updated by regex match)
// DIAMOND HARBOUR -> 0096195618
// TAMLUK -> 0096195632

const fixes = [
    { filter: { centreName: 'DIAMOND HARBOUR' }, posKey: '0096195618' },
    { filter: { centreName: 'TAMLUK' },          posKey: '0096195632' },
];

for (const fix of fixes) {
    const r = await Centre.updateMany(fix.filter, { $set: { posKey: fix.posKey } });
    console.log(`✅ ${JSON.stringify(fix.filter)}: updated ${r.modifiedCount} records → ${fix.posKey}`);
}

await mongoose.disconnect();
console.log("Done.");
