import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function debugDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const Centre = mongoose.model('Centre', new mongoose.Schema({}, { strict: false }), 'centres');
        const centres = await Centre.find().limit(5);
        console.log('\nSample Centres:', centres.map(c => c.centreName));

        const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }), 'departments');
        const depts = await Department.find().limit(5);
        console.log('\nSample Departments:', depts.map(d => d.departmentName));

        const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }), 'classes');
        const classes = await Class.find().limit(5);
        console.log('\nSample Classes:', classes.map(c => c.className || c.name));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugDB();
