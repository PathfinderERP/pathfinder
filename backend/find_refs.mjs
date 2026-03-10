
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function findRefs() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const db = mongoose.connection;

        console.log('\n--- Searching for Course ---');
        const course = await db.collection("courses").findOne({
            courseName: { $regex: /Foundation.*VII.*Outstation/i }
        });
        if (course) {
            console.log('✅ Found Course:', course.courseName, '| _id:', course._id);
            console.log('   Department:', course.department, '| ExamTag:', course.examTag);
        } else {
             const allCourses = await db.collection("courses")
                .find({ courseName: { $regex: /Foundation.*VII/i } })
                .toArray();
            console.log('❌ Course not found exactly. Similar courses:');
            allCourses.forEach(c => console.log('  -', c.courseName, '|', c._id));
        }

        console.log('\n--- Searching for Class 7 ---');
        const class7 = await db.collection("classes").findOne({
            $or: [
                { className: { $regex: /^7$|^VII$/i } },
                { name: { $regex: /^7$|^VII$/i } }
            ]
        });
        if (class7) {
            console.log('✅ Found Class:', class7.className || class7.name, '| _id:', class7._id);
        } else {
            console.log('❌ Class 7 not found.');
            const allClasses = await db.collection("classes").find({}).toArray();
            console.log('   Available classes:');
            allClasses.forEach(c => console.log('  -', c.className || c.name, '|', c._id));
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

findRefs();
