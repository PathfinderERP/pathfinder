import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AcademicsTopic from '../models/Academics/Academics_topic.js';
import AcademicsChapter from '../models/Academics/Academics_chapter.js';
import AcademicsSubject from '../models/Academics/Academics_subject.js';
import AcademicsClass from '../models/Academics/Academics_class.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/pathfinder_erp';

async function checkCounts() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("DB Counts:");
        console.log("Classes:", await AcademicsClass.countDocuments());
        console.log("Subjects:", await AcademicsSubject.countDocuments());
        console.log("Chapters:", await AcademicsChapter.countDocuments());
        console.log("Topics:", await AcademicsTopic.countDocuments());
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkCounts();
