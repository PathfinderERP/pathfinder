import mongoose from 'mongoose';
import 'dotenv/config';
import PartTimeTeacher from '../models/Finance/PartTimeTeacher.js';

const debugPartTimeTeachers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const teachers = await PartTimeTeacher.find({}).lean();

        console.log("--- Part Time Teachers ---");
        teachers.forEach(t => {
            console.log(`Name: ${t.name}, Employee ID Ref: ${t.employeeId}, Status: ${t.status}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugPartTimeTeachers();
