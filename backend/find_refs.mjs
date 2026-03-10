
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function findRefs() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const db = mongoose.connection;

        const coursesToFind = [
            { name: "NEET 25-27", regex: /NEET.*25-27/i },
            { name: "FOUNDATION 25-26(VII)", regex: /FOUNDATION.*25-26.*VII/i },
            { name: "FOUNDATION 25-26(VIII)", regex: /FOUNDATION.*25-26.*VIII/i },
            { name: "FOUNDATION 25-26(IX)", regex: /FOUNDATION.*25-26.*IX/i }
        ];

        console.log('\n--- Searching for Courses ---');
        for (const target of coursesToFind) {
            const course = await db.collection("courses").findOne({
                courseName: { $regex: target.regex }
            });
            if (course) {
                console.log(`✅ Found Course: ${course.courseName} | _id: ${course._id}`);
                console.log(`   Class ID: ${course.class} | Dept: ${course.department} | ExamTag: ${course.examTag}`);
            } else {
                console.log(`❌ Course NOT FOUND: ${target.name}`);
                const similar = await db.collection("courses")
                    .find({ courseName: { $regex: new RegExp(target.name.split(' ')[0], 'i') } })
                    .limit(3)
                    .toArray();
                if (similar.length > 0) {
                    console.log('   Similar courses:');
                    similar.forEach(s => console.log('     -', s.courseName, '|', s._id));
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

findRefs();
