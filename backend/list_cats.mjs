
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function listCats() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const db = mongoose.connection;
        
        console.log('\n--- Sessions ---');
        const sessions = await db.collection("sessions").find({}).toArray();
        sessions.forEach(s => console.log('  -', s.sessionName, '|', s._id));

        console.log('\n--- Classes ---');
        const classes = await db.collection("classes").find({}).toArray();
        classes.forEach(c => console.log('  -', c.className || c.name, '|', c._id));

        console.log('\n--- Recent Courses (latest 20) ---');
        const courses = await db.collection("courses")
            .find({})
            .sort({ _id: -1 })
            .limit(20)
            .toArray();
        courses.forEach(c => console.log('  -', c.courseName, '| Session:', c.courseSession, '| ID:', c._id));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listCats();
