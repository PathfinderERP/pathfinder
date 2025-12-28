import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
        const employees = await Employee.find({ profileImage: { $exists: true, $ne: null } }).limit(5);
        console.log('Employees with profileImage:');
        employees.forEach(e => {
            console.log(`Name: ${e.get('name')}, Image: ${e.get('profileImage')}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
