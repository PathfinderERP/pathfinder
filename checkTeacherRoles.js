import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './backend/models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

await mongoose.connect(process.env.MONGO_URL);

const names = [
    'MANIK JANA', 'TANBIR AHMED', 'PARTHA PRATIM MONDAL', 'RITBRATA BHATTACHARYA',
    'PRITHWISH DUTTA', 'AZIZUL HAQUE (FT)', 'SUBHADIP JANA', 'RUPAK DHAR',
    'KRISHNENDU BRAHMACHARI', 'MOUMITA MADAM', 'PEU DUTTA', 'TUSHAR KANTO DEY',
    'DEBADITYA MUKHERJEE (FT)', 'RAMESH MUKHERJEE', 'RAHUL ROY', 'MAHUA SINHA ROY',
    'SHREYA DAS', 'ADITYA AGARWAL', 'PRADIP KARMAKAR', 'ASISH KARAN',
    'SAYANTAN SARCAR', 'DEBLINA ROY'
];

const users = await User.find({ name: { $in: names } }).select('name role employeeId');

console.log('\nRole check for all 22 teachers:\n');
users.forEach(u => {
    const ok = u.role === 'teacher';
    console.log(`${ok ? '✅' : '❌'} ${u.name.padEnd(30)} | role: ${u.role.padEnd(12)} | empId: ${u.employeeId}`);
});

const wrongRole = users.filter(u => u.role !== 'teacher');
if (wrongRole.length > 0) {
    console.log(`\n⚠️  ${wrongRole.length} user(s) have wrong role — fixing now...`);
    await User.updateMany({ name: { $in: wrongRole.map(u => u.name) } }, { $set: { role: 'teacher' } });
    console.log('✅ All fixed.');
} else {
    console.log(`\n✅ All ${users.length} users already have role = teacher`);
}

const missing = names.filter(n => !users.find(u => u.name.toLowerCase() === n.toLowerCase()));
if (missing.length) console.log('\n⚠️  Not found in DB:', missing);

await mongoose.disconnect();
