import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URL);

const names = [
    'MANIK JANA', 'TANBIR AHMED', 'PARTHA PRATIM MONDAL', 'RITBRATA BHATTACHARYA',
    'PRITHWISH DUTTA', 'AZIZUL HAQUE (FT)', 'SUBHADIP JANA', 'RUPAK DHAR',
    'KRISHNENDU BRAHMACHARI', 'MOUMITA MADAM', 'PEU DUTTA', 'TUSHAR KANTO DEY',
    'DEBADITYA MUKHERJEE (FT)', 'RAMESH MUKHERJEE', 'RAHUL ROY', 'MAHUA SINHA ROY',
    'SHREYA DAS', 'ADITYA AGARWAL', 'PRADIP KARMAKAR', 'ASISH KARAN',
    'SAYANTAN SARCAR', 'DEBLINA ROY'
];

// Use case-insensitive regex per name
const users = await User.find({
    name: { $in: names.map(n => new RegExp(`^${n}$`, 'i')) }
}).select('name role employeeId');

console.log('\nRole check for all 22 imported teachers:\n');
users.forEach(u => {
    const ok = u.role === 'teacher';
    console.log(`${ok ? '✅' : '❌'} ${u.name.padEnd(35)} | role: ${String(u.role).padEnd(12)} | empId: ${u.employeeId}`);
});

const wrongRole = users.filter(u => u.role !== 'teacher');
if (wrongRole.length > 0) {
    console.log(`\n⚠️  ${wrongRole.length} user(s) have WRONG role — fixing now...`);
    for (const u of wrongRole) {
        await User.findByIdAndUpdate(u._id, { $set: { role: 'teacher' } });
        console.log(`   → Fixed: ${u.name} (was: ${u.role})`);
    }
    console.log('✅ All corrected.');
} else {
    console.log(`\n✅ All ${users.length} found users already have role = teacher`);
}

const missing = names.filter(n => !users.find(u => u.name.toUpperCase() === n.toUpperCase()));
if (missing.length) {
    console.log('\n⚠️  These names were NOT found in DB:', missing);
} else {
    console.log('✅ All 22 names found in DB.');
}

await mongoose.disconnect();
console.log('\nDone.');
