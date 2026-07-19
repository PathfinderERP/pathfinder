import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import ClassSchedule from './models/Academics/ClassSchedule.js';
import StudentAttendance from './models/Academics/StudentAttendance.js';
import PartTimeTeacher from './models/Finance/PartTimeTeacher.js';
import Employee from './models/HR/Employee.js';
import CentreSchema from './models/Master_data/Centre.js';
import Subject from './models/Master_data/Subject.js';
import Course from './models/Master_data/Courses.js';
import Batch from './models/Master_data/Batch.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        // 1. Teachers count & distribution
        const teachers = await User.find({ role: "teacher" }).lean();
        const activeTeachers = teachers.filter(t => t.isActive !== false);
        console.log(`\nTotal Teachers in User Collection: ${teachers.length}`);
        console.log(`Active Teachers: ${activeTeachers.length}`);

        // Sample teacher
        if (activeTeachers.length > 0) {
            console.log("\nSample Teacher User Doc:", JSON.stringify(activeTeachers[0], null, 2));
        }

        // 2. Class schedules count
        const scheduleCount = await ClassSchedule.countDocuments();
        console.log(`\nTotal Class Schedules: ${scheduleCount}`);
        const statusGroups = await ClassSchedule.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        console.log("Class Schedules by Status:", statusGroups);

        const modeGroups = await ClassSchedule.aggregate([
            { $group: { _id: "$classMode", count: { $sum: 1 } } }
        ]);
        console.log("Class Schedules by Mode:", modeGroups);

        // Sample ClassSchedule
        const sampleCompleted = await ClassSchedule.findOne({ status: "Completed" }).lean();
        console.log("\nSample Completed ClassSchedule:", JSON.stringify(sampleCompleted, null, 2));

        const sampleUpcoming = await ClassSchedule.findOne({ status: "Upcoming" }).lean();
        console.log("\nSample Upcoming ClassSchedule:", JSON.stringify(sampleUpcoming, null, 2));

        // 3. Student Attendance
        const attendanceCount = await StudentAttendance.countDocuments();
        console.log(`\nTotal Student Attendance Records: ${attendanceCount}`);
        const attendanceStatus = await StudentAttendance.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        console.log("Student Attendance Status:", attendanceStatus);

        // Sample StudentAttendance
        const sampleAttendance = await StudentAttendance.findOne().lean();
        console.log("\nSample Student Attendance Record:", JSON.stringify(sampleAttendance, null, 2));

        // 4. PartTimeTeacher
        const pttCount = await PartTimeTeacher.countDocuments();
        console.log(`\nTotal Part-time Teacher finance records: ${pttCount}`);
        if (pttCount > 0) {
            const samplePtt = await PartTimeTeacher.findOne().lean();
            console.log("Sample Part-time Teacher record:", JSON.stringify(samplePtt, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
