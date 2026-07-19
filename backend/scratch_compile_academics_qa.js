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
import TeacherBooking from './models/Academics/TeacherBooking.js';
import TeacherRoutine from './models/Academics/TeacherRoutine.js';
import AcademicsChapter from './models/Academics/Academics_chapter.js';
import AcademicsTopic from './models/Academics/Academics_topic.js';
import DailyTrackingLog from './models/DailyTrackingLog.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const data = {};

        // 1. Teachers count by subject, centre, board, course
        const teachers = await User.find({ role: "teacher", isActive: true }).lean();
        const centres = await CentreSchema.find({}).lean();
        const centreMap = {};
        centres.forEach(c => { centreMap[c._id.toString()] = c.centreName; });

        // Distributions
        const bySubject = {};
        const byBoard = {};
        const byCentre = {};
        const byType = {};

        teachers.forEach(t => {
            // Subject
            let subs = t.subject || [];
            if (typeof subs === 'string') subs = [subs];
            if (Array.isArray(subs)) {
                subs.forEach(s => {
                    bySubject[s] = (bySubject[s] || 0) + 1;
                });
            }
            if (!subs || subs.length === 0) bySubject["Unassigned"] = (bySubject["Unassigned"] || 0) + 1;

            // Board
            const b = t.boardType || "Unassigned";
            byBoard[b] = (byBoard[b] || 0) + 1;

            // Centre
            let cents = t.centres || [];
            if (typeof cents === 'string') cents = [cents];
            if (Array.isArray(cents)) {
                cents.forEach(cId => {
                    const cName = centreMap[cId.toString()] || "Unknown Center";
                    byCentre[cName] = (byCentre[cName] || 0) + 1;
                });
            }
            if (!cents || cents.length === 0) byCentre["Unassigned"] = (byCentre["Unassigned"] || 0) + 1;

            // Type
            const type = t.teacherType || "Full Time";
            byType[type] = (byType[type] || 0) + 1;
        });

        data.teacherDistribution = {
            totalActive: teachers.length,
            bySubject,
            byBoard,
            byCentre,
            byType
        };

        // 2. Workload & delivered hours per teacher
        // We will fetch all schedules
        const schedules = await ClassSchedule.find({}).lean();
        const teacherMap = {};
        teachers.forEach(t => {
            teacherMap[t._id.toString()] = {
                name: t.name,
                subject: t.subject || [],
                type: t.teacherType || "Full Time",
                scheduledClasses: 0,
                deliveredClasses: 0,
                scheduledHours: 0,
                deliveredHours: 0
            };
        });

        schedules.forEach(s => {
            const tId = s.teacherId?.toString();
            if (!tId || !teacherMap[tId]) return;

            // Calculate class hours
            let hours = s.classHours || 0;
            if (hours === 0 && s.startTime && s.endTime) {
                const [sh, sm] = s.startTime.split(':').map(Number);
                const [eh, em] = s.endTime.split(':').map(Number);
                hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
                if (hours < 0) hours += 24; // Handle overnight wrap if any
            }

            teacherMap[tId].scheduledClasses++;
            teacherMap[tId].scheduledHours += hours;

            if (s.status === "Completed") {
                teacherMap[tId].deliveredClasses++;
                teacherMap[tId].deliveredHours += hours;
            }
        });

        // 3. Salaries and cost per hour
        const employees = await Employee.find({ status: "Active" }).select("employeeId currentSalary name user").lean();
        const empSalaryMap = {};
        employees.forEach(e => {
            if (e.user) empSalaryMap[e.user.toString()] = e.currentSalary || 0;
        });

        const partTimeRates = await PartTimeTeacher.find({ status: "ACTIVE" }).lean();
        const ptRateMap = {};
        partTimeRates.forEach(pt => {
            ptRateMap[pt.teacherId.toString()] = { rate: pt.rate, feeType: pt.feeType };
        });

        const workloads = Object.entries(teacherMap).map(([tId, info]) => {
            const salary = empSalaryMap[tId] || 0;
            const ptInfo = ptRateMap[tId];
            let costPerHour = 0;
            let costSource = "N/A";

            if (info.type.toLowerCase().includes("part")) {
                if (ptInfo) {
                    costPerHour = ptInfo.rate;
                    costSource = `Part-Time Rate (${ptInfo.feeType})`;
                } else {
                    costPerHour = 500; // default estimated part-time rate
                    costSource = "Estimated Part-Time Rate";
                }
            } else {
                // Full-time: salary divided by delivered hours (say, monthly average workload is deliveredHours / 3 months or similar. 
                // Let's divide monthly salary by actual delivered hours in the dataset. If delivered hours > 0:
                costPerHour = info.deliveredHours > 0 ? (salary / info.deliveredHours) : 0;
                costSource = `Full-time Salary (${salary}/mo)`;
            }

            return {
                id: tId,
                name: info.name,
                subject: info.subject,
                type: info.type,
                scheduledClasses: info.scheduledClasses,
                deliveredClasses: info.deliveredClasses,
                scheduledHours: Math.round(info.scheduledHours * 10) / 10,
                deliveredHours: Math.round(info.deliveredHours * 10) / 10,
                salary: salary,
                costPerHour: Math.round(costPerHour * 10) / 10,
                costSource
            };
        });

        data.workloads = workloads;

        // Underutilized or overloaded teachers
        const underutilized = workloads.filter(w => w.deliveredHours < 10);
        const overloaded = workloads.filter(w => w.deliveredHours > 80); // throughout the session
        data.workloadSummary = {
            underutilizedCount: underutilized.length,
            overloadedCount: overloaded.length,
            sampleUnderutilized: underutilized.slice(0, 10).map(u => ({ name: u.name, hours: u.deliveredHours, type: u.type })),
            sampleOverloaded: overloaded.slice(0, 10).map(o => ({ name: o.name, hours: o.deliveredHours, type: o.type }))
        };

        // 4. Student attendance rate per teacher
        // We will fetch student attendance and group by classScheduleId
        const studentAttendances = await StudentAttendance.find({}).lean();
        const schedAttendanceMap = {};
        studentAttendances.forEach(a => {
            const sId = a.classScheduleId?.toString();
            if (!sId) return;
            if (!schedAttendanceMap[sId]) schedAttendanceMap[sId] = { present: 0, total: 0 };
            schedAttendanceMap[sId].total++;
            if (a.status === "Present") schedAttendanceMap[sId].present++;
        });

        // Map schedule attendance back to teacher
        const teacherAttendanceStats = {};
        schedules.forEach(s => {
            const tId = s.teacherId?.toString();
            if (!tId || !teacherMap[tId]) return;
            const att = schedAttendanceMap[s._id.toString()];
            if (!att || att.total === 0) return;

            if (!teacherAttendanceStats[tId]) {
                teacherAttendanceStats[tId] = { name: teacherMap[tId].name, present: 0, total: 0 };
            }
            teacherAttendanceStats[tId].present += att.present;
            teacherAttendanceStats[tId].total += att.total;
        });

        const teacherStudentAttendance = Object.entries(teacherAttendanceStats).map(([tId, info]) => {
            const rate = info.total > 0 ? (info.present / info.total) * 100 : 0;
            return {
                teacherId: tId,
                name: info.name,
                studentAttendanceRate: Math.round(rate * 10) / 10,
                totalRecords: info.total
            };
        }).sort((a, b) => b.studentAttendanceRate - a.studentAttendanceRate);

        data.teacherStudentAttendance = teacherStudentAttendance;

        // 5. Punctuality & Cancellation
        // How many completed class schedules have actualStartTime vs startTime?
        let punctualityCount = 0;
        let totalPunctualTimeDiff = 0;
        let lateCount = 0;

        schedules.forEach(s => {
            if (s.status === "Completed" && s.actualStartTime && s.startTime) {
                // actualStartTime is Date, scheduled startTime is e.g. "10:00"
                const schedTime = new Date(s.date || s.createdAt);
                const [sh, sm] = s.startTime.split(':').map(Number);
                schedTime.setHours(sh, sm, 0, 0);

                const actTime = new Date(s.actualStartTime);
                // Difference in minutes
                const diffMin = (actTime.getTime() - schedTime.getTime()) / (1000 * 60);
                
                // If schedule actual start date doesn't match the schedule date, it might be started late
                // Let's filter differences that are reasonable (e.g. within the same day)
                if (Math.abs(diffMin) < 1440) {
                    punctualityCount++;
                    totalPunctualTimeDiff += diffMin;
                    if (diffMin > 15) {
                        lateCount++;
                    }
                }
            }
        });

        // Cancelled classes count: Let's see if there are any schedules with remarks about cancel or reschedule
        let cancelledClasses = 0;
        let rescheduledClasses = 0;
        schedules.forEach(s => {
            const msg = (s.message || "").toLowerCase();
            const cName = (s.className || "").toLowerCase();
            if (msg.includes("cancel") || cName.includes("cancel")) cancelledClasses++;
            if (msg.includes("reschedule") || cName.includes("reschedule")) rescheduledClasses++;
        });

        data.punctuality = {
            totalCompletedWithPunctualityData: punctualityCount,
            averageDelayMinutes: punctualityCount > 0 ? Math.round((totalPunctualTimeDiff / punctualityCount) * 10) / 10 : 0,
            classesDelayedMoreThan15Mins: lateCount,
            latePercentage: punctualityCount > 0 ? Math.round((lateCount / punctualityCount) * 100) : 0,
            cancelledClasses,
            rescheduledClasses
        };

        // 6. Time Slots and Attendance Rate
        const timeSlotAttendance = {};
        schedules.forEach(s => {
            if (!s.startTime || !s.endTime) return;
            const slot = `${s.startTime}-${s.endTime}`;
            const att = schedAttendanceMap[s._id.toString()];
            if (!att || att.total === 0) return;

            if (!timeSlotAttendance[slot]) {
                timeSlotAttendance[slot] = { slot, present: 0, total: 0, classesCount: 0 };
            }
            timeSlotAttendance[slot].present += att.present;
            timeSlotAttendance[slot].total += att.total;
            timeSlotAttendance[slot].classesCount++;
        });

        const timeSlotStats = Object.values(timeSlotAttendance).map(ts => {
            const rate = ts.total > 0 ? (ts.present / ts.total) * 100 : 0;
            return {
                slot: ts.slot,
                attendanceRate: Math.round(rate * 10) / 10,
                classesCount: ts.classesCount
            };
        }).sort((a, b) => a.attendanceRate - b.attendanceRate);

        data.timeSlotStats = timeSlotStats;

        // 7. Teacher Bookings & Routine sample
        const bookings = await TeacherBooking.find({}).lean();
        const routines = await TeacherRoutine.find({}).lean();
        data.teacherBookingCount = bookings.length;
        data.teacherRoutineCount = routines.length;

        if (bookings.length > 0) {
            data.sampleBooking = bookings[0];
        }
        if (routines.length > 0) {
            data.sampleRoutine = routines[0];
        }

        // 8. Physical location conflict check
        // Group schedules by teacherId and date, see if they are scheduled at different centres on the same day with overlapping times
        const teacherDayClasses = {};
        schedules.forEach(s => {
            const tId = s.teacherId?.toString();
            if (!tId || !s.date) return;
            const dateStr = new Date(s.date).toISOString().split('T')[0];
            const key = `${tId}_${dateStr}`;
            if (!teacherDayClasses[key]) teacherDayClasses[key] = [];
            teacherDayClasses[key].push(s);
        });

        const conflicts = [];
        Object.entries(teacherDayClasses).forEach(([key, list]) => {
            if (list.length < 2) return;
            // Check conflicts between classes in list
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const c1 = list[i];
                    const c2 = list[j];

                    // Check if center differs
                    const cent1 = c1.centreId?.toString() || c1.centreIds?.[0]?.toString();
                    const cent2 = c2.centreId?.toString() || c2.centreIds?.[0]?.toString();
                    if (!cent1 || !cent2 || cent1 === cent2) continue;

                    // Check overlapping time
                    const [s1h, s1m] = c1.startTime.split(':').map(Number);
                    const [e1h, e1m] = c1.endTime.split(':').map(Number);
                    const [s2h, s2m] = c2.startTime.split(':').map(Number);
                    const [e2h, e2m] = c2.endTime.split(':').map(Number);

                    const start1 = s1h * 60 + s1m;
                    const end1 = e1h * 60 + e1m;
                    const start2 = s2h * 60 + s2m;
                    const end2 = e2h * 60 + e2m;

                    // Overlap check
                    if (start1 < end2 && start2 < end1) {
                        conflicts.push({
                            teacherName: teacherMap[c1.teacherId?.toString()]?.name || "Unknown",
                            date: key.split('_')[1],
                            class1: { name: c1.className, time: `${c1.startTime}-${c1.endTime}`, centre: centreMap[cent1] || cent1 },
                            class2: { name: c2.className, time: `${c2.startTime}-${c2.endTime}`, centre: centreMap[cent2] || cent2 }
                        });
                    }
                }
            }
        });
        data.schedulingConflicts = conflicts;

        // 9. Syllabus completion & chapters
        const chaptersCount = await AcademicsChapter.countDocuments();
        const topicsCount = await AcademicsTopic.countDocuments();
        data.chaptersCount = chaptersCount;
        data.topicsCount = topicsCount;

        // Print final summary
        console.log("Analysis completed successfully");
        const fs = await import('fs');
        fs.writeFileSync('../scratch/academics_qa_data.json', JSON.stringify(data, null, 2));
        console.log("Saved results to scratch/academics_qa_data.json");

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
