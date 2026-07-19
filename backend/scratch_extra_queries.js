import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import ClassSchedule from './models/Academics/ClassSchedule.js';
import StudentAttendance from './models/Academics/StudentAttendance.js';
import Student from './models/Students.js';
import Batch from './models/Master_data/Batch.js';
import Feedback from './models/HR/Feedback.js';
import FollowUpFeedback from './models/Master_data/FollowUpFeedback.js';
import CentreSchema from './models/Master_data/Centre.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const data = {};

        // 1. Check HR Feedbacks and FollowUp Feedbacks
        const hrFeedbacks = await Feedback.find({}).lean();
        const followUps = await FollowUpFeedback.find({}).lean();
        console.log(`HR Feedbacks: ${hrFeedbacks.length}`);
        console.log(`FollowUp Feedbacks: ${followUps.length}`);
        if (hrFeedbacks.length > 0) {
            console.log("Sample HR Feedback:", JSON.stringify(hrFeedbacks[0], null, 2));
        }
        if (followUps.length > 0) {
            console.log("Sample FollowUp Feedback:", JSON.stringify(followUps[0], null, 2));
        }

        // 2. Batch sizing and student count per batch
        const students = await Student.find({ isEnrolled: true }).select("batches name").lean();
        const batchStudentCounts = {};
        students.forEach(s => {
            const batList = s.batches || [];
            batList.forEach(bId => {
                const bStr = bId.toString();
                batchStudentCounts[bStr] = (batchStudentCounts[bStr] || 0) + 1;
            });
        });

        const batches = await Batch.find({}).lean();
        const batchSizes = batches.map(b => {
            const count = batchStudentCounts[b._id.toString()] || 0;
            return {
                id: b._id,
                name: b.batchName,
                studentCount: count
            };
        }).sort((a, b) => b.studentCount - a.studentCount);
        data.topBatchSizes = batchSizes.slice(0, 10);
        data.bottomBatchSizes = batchSizes.filter(b => b.studentCount > 0).slice(-10);

        // 3. Repeatedly absent students (with student details)
        const absences = await StudentAttendance.aggregate([
            { $match: { status: "Absent" } },
            { $group: { _id: "$studentId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        
        const absentStudentIds = absences.map(a => a._id);
        const absentStudentsInfo = await Student.find({ _id: { $in: absentStudentIds } }).select("studentsDetails").lean();
        const studentInfoMap = {};
        absentStudentsInfo.forEach(st => {
            studentInfoMap[st._id.toString()] = st.studentsDetails?.[0]?.studentName || "Unknown Student";
        });

        data.repeatedlyAbsentStudents = absences.map(a => ({
            studentId: a._id,
            name: studentInfoMap[a._id?.toString()] || "Unknown",
            absencesCount: a.count
        }));

        // 4. Excessive center dependency on one teacher
        // Group Completed schedules by centreId and teacherId
        const schedules = await ClassSchedule.find({ status: "Completed" }).lean();
        const centres = await CentreSchema.find({}).lean();
        const centreNameMap = {};
        centres.forEach(c => { centreNameMap[c._id.toString()] = c.centreName; });

        const centreTeacherClasses = {};
        schedules.forEach(s => {
            const cId = s.centreId?.toString() || s.centreIds?.[0]?.toString();
            const tId = s.teacherId?.toString();
            if (!cId || !tId) return;

            if (!centreTeacherClasses[cId]) centreTeacherClasses[cId] = { totalClasses: 0, teachers: {} };
            centreTeacherClasses[cId].totalClasses++;
            centreTeacherClasses[cId].teachers[tId] = (centreTeacherClasses[cId].teachers[tId] || 0) + 1;
        });

        // Resolve teacher names
        const teachers = await User.find({ role: "teacher" }).select("name").lean();
        const teacherNameMap = {};
        teachers.forEach(t => { teacherNameMap[t._id.toString()] = t.name; });

        const dependencies = [];
        Object.entries(centreTeacherClasses).forEach(([cId, info]) => {
            const cName = centreNameMap[cId] || "Unknown Center";
            Object.entries(info.teachers).forEach(([tId, count]) => {
                const tName = teacherNameMap[tId] || "Unknown Teacher";
                const percentage = info.totalClasses > 0 ? (count / info.totalClasses) * 100 : 0;
                dependencies.push({
                    centre: cName,
                    teacher: tName,
                    classesConducted: count,
                    totalCentreClasses: info.totalClasses,
                    dependencyPercentage: Math.round(percentage * 10) / 10
                });
            });
        });

        // Filter and sort dependencies where percentage is high and classes count is significant
        data.centreDependencies = dependencies
            .filter(d => d.totalCentreClasses >= 10)
            .sort((a, b) => b.dependencyPercentage - a.dependencyPercentage)
            .slice(0, 15);

        // 5. Doubt clearing sessions
        const doubtClasses = await ClassSchedule.find({
            className: { $regex: /doubt|clear|dpp|discussion/i }
        }).lean();
        data.doubtSessions = {
            totalRequested: doubtClasses.length,
            completed: doubtClasses.filter(c => c.status === "Completed").length,
            upcoming: doubtClasses.filter(c => c.status === "Upcoming").length
        };

        const fs = await import('fs');
        fs.writeFileSync('../scratch/academics_extra_data.json', JSON.stringify(data, null, 2));
        console.log("Saved extra results to scratch/academics_extra_data.json");

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
