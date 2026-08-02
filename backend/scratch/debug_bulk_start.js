import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ClassSchedule from '../models/Academics/ClassSchedule.js';

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const targetIds = ['6a5c432d8c78ac79687975ca', '6a5c44838c78ac796879b891'];
        const classesToStart = await ClassSchedule.find({ _id: { $in: targetIds } });

        const isValidClass = (c) => {
            const hasSubject = Boolean(c.acadSubjectId || c.subjectId || (c.subjectName && c.subjectName !== "N/A"));
            const hasChapter = Boolean((c.chapterIds && c.chapterIds.length > 0) || c.chapterId || (c.chapterName && c.chapterName !== "N/A") || c.chapter);
            const hasTopic = Boolean((c.topicIds && c.topicIds.length > 0) || (c.topicName && c.topicName !== "N/A") || c.topic);
            return hasSubject && hasChapter && hasTopic;
        };

        const invalidClasses = classesToStart.filter(c => !isValidClass(c));
        const validClassIds = classesToStart.filter(c => isValidClass(c)).map(c => c._id);

        console.log('Total selected classes:', classesToStart.length);
        console.log('Invalid classes count:', invalidClasses.length);
        console.log('Valid class IDs count:', validClassIds.length);
        console.log('Valid class IDs:', validClassIds.map(id => id.toString()));

    } catch (err) {
        console.error('Debug error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
