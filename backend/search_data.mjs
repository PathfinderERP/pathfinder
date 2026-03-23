
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const Course = mongoose.model('Course', new mongoose.Schema({courseName: String}));
        const Centre = mongoose.model('Centre', new mongoose.Schema({centreName: String}));
        
        const courses = await Course.find({courseName: /NEET 2Years 2026-2028/i});
        const centres = await Centre.find({centreName: /Hazra/i});
        
        console.log('--- COURSES ---');
        console.log(JSON.stringify(courses, null, 2));
        console.log('--- CENTRES ---');
        console.log(JSON.stringify(centres, null, 2));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
run();
