import mongoose from 'mongoose';
import xlsx from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

const wb = xlsx.readFile('c:\\Users\\MALAY\\erp_1\\exports_data\\RAZORPAY_DEVICE_ID.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

await mongoose.connect(process.env.MONGO_URL);
console.log("Connected to MongoDB");

const Centre = (await import('./models/Master_data/Centre.js')).default;

let updated = 0;
for (const row of data) {
    const centreName = row.centre_name?.trim();
    const deviceId = row.Device_Id?.toString().trim();
    if (!centreName || !deviceId) continue;

    const result = await Centre.updateOne(
        { centreName: centreName },
        { $set: { posKey: deviceId } }
    );
    
    if (result.matchedCount > 0) {
        console.log(`✅ ${centreName}: posKey updated to ${deviceId}`);
        updated++;
    } else {
        console.log(`⚠️  ${centreName}: No matching centre found in DB`);
    }
}

console.log(`\nDone. Updated ${updated} centres.`);
await mongoose.disconnect();
