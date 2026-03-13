import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Master_data/Courses.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URL);
    const searches = [
        "Foundation Class VIII",
        "Foundation Outstation Class",
        "Foundation Class X"
    ];

    for (const search of searches) {
        const courses = await Course.find({ courseName: { $regex: new RegExp(search, 'i') } }, { courseName: 1 });
        console.log(`Search: ${search}`);
        console.log(JSON.stringify(courses, null, 2));
    }
    process.exit(0);
}

run();
