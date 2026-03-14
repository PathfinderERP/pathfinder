import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';
import Centre from './models/Master_data/Centre.js';

dotenv.config();
const MONGO_URL = process.env.MONGO_URL;

async function findData() {
    try {
        await mongoose.connect(MONGO_URL);
        const courses = await Course.find({ courseName: { $regex: /TAAT B CBSE JEE/i } });
        console.log("Found Courses:", courses.map(c => ({id: c._id, name: c.courseName})));

        const centres = await Centre.find({ centreName: { $regex: /HAZRA/i } });
        console.log("Found Centres:", centres.map(c => ({id: c._id, name: c.centreName, code: c.enterCode})));
        
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

findData();
