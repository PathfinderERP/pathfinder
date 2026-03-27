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

// Check current posKey values in DB
const centres = await Centre.find({ centreName: { $in: data.map(d => d.centre_name) } }, { centreName: 1, posKey: 1 });
console.log("\n=== Current DB posKey values ===");
for (const c of centres) {
    const match = data.find(d => d.centre_name === c.centreName);
    console.log(`${c.centreName}: DB posKey="${c.posKey}" | XLSX Device_Id="${match?.Device_Id}" | XLSX Serial="${match?.Device_serial_number}"`);
}

await mongoose.disconnect();
