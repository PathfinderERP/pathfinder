import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AcademicsTopic from '../models/Academics/Academics_topic.js';
import AcademicsChapter from '../models/Academics/Academics_chapter.js';
import AcademicsSubject from '../models/Academics/Academics_subject.js';
import AcademicsClass from '../models/Academics/Academics_class.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/pathfinder_erp';

async function importData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const csvPath = 'c:/Users/USER/erp_1/uploads/test.attendence_topics.csv';
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n');

        const stats = { total: 0, success: 0, failed: 0, skipped: 0 };

        const classCache = {};
        const subjectCache = {};
        const chapterCache = {};

        for (const line of lines) {
            if (!line.trim()) continue;

            const rowParts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));

            if (rowParts.length < 4) continue;

            const [topicName, className, subjectName, chapterName] = rowParts;
            stats.total++;

            try {
                // 1. Class
                let classId = classCache[className.toLowerCase()];
                if (!classId) {
                    let classDoc = await AcademicsClass.findOne({ className: { $regex: new RegExp(`^${className}$`, "i") } });
                    if (!classDoc) {
                        classDoc = new AcademicsClass({ className });
                        await classDoc.save();
                    }
                    classId = classDoc._id;
                    classCache[className.toLowerCase()] = classId;
                }

                // 2. Subject
                const subjectKey = `${classId}_${subjectName}`.toLowerCase();
                let subjectId = subjectCache[subjectKey];
                if (!subjectId) {
                    let subjectDoc = await AcademicsSubject.findOne({
                        subjectName: { $regex: new RegExp(`^${subjectName}$`, "i") },
                        classId
                    });
                    if (!subjectDoc) {
                        subjectDoc = new AcademicsSubject({ subjectName, classId });
                        await subjectDoc.save();
                    }
                    subjectId = subjectDoc._id;
                    subjectCache[subjectKey] = subjectId;
                }

                // 3. Chapter
                const chapterKey = `${subjectId}_${chapterName}`.toLowerCase();
                let chapterId = chapterCache[chapterKey];
                if (!chapterId) {
                    let chapterDoc = await AcademicsChapter.findOne({
                        chapterName: { $regex: new RegExp(`^${chapterName}$`, "i") },
                        subjectId
                    });
                    if (!chapterDoc) {
                        chapterDoc = new AcademicsChapter({ chapterName, subjectId });
                        await chapterDoc.save();
                    }
                    chapterId = chapterDoc._id;
                    chapterCache[chapterKey] = chapterId;
                }

                // 4. Topic
                const existing = await AcademicsTopic.findOne({
                    topicName: { $regex: new RegExp(`^${topicName}$`, "i") },
                    chapterId
                });

                if (existing) {
                    stats.skipped++;
                    continue;
                }

                const newTopic = new AcademicsTopic({ topicName, chapterId });
                await newTopic.save();
                stats.success++;

            } catch (err) {
                console.error(`Error processing line: ${line}`, err.message);
                stats.failed++;
            }
        }

        console.log("Import Results:", stats);
        process.exit(0);
    } catch (error) {
        console.error("Critical Import Error:", error);
        process.exit(1);
    }
}

importData();
