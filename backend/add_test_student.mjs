import mongoose from 'mongoose';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Student from './models/Students.js';
import Boards from './models/Master_data/Boards.js';

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27017/pathfinder');
        console.log("Connected to MongoDB");

        // 1. Create Student
        const newStudent = new Student({
            studentsDetails: [{
                studentName: "DEVDAAN MAITY",
                mobileNum: "8013734650",
                whatsappNumber: "8013734650",
                studentEmail: "chandanamaity789@gmail.com",
                centre: "GENERAL",
                programme: "CRP"
            }],
            isEnrolled: true
        });
        await newStudent.save();
        console.log("Student Created:", newStudent._id);

        // 2. Find/Create Board (Assume CBSE for foundation IX)
        let board = await Boards.findOne({ boardCourse: { $regex: /Foundation IX/i } });
        if (!board) {
            board = await Boards.findOne({}); // Fallback
        }

        // 3. Create Board Admission
        const monthlyAmount = (17700 - 0) / 12; // Just a guess for distribution
        const installments = [];
        for (let i = 1; i <= 12; i++) {
            installments.push({
                monthNumber: i,
                dueDate: new Date(2026, 2 + i, 1),
                standardAmount: monthlyAmount,
                payableAmount: monthlyAmount,
                paidAmount: i <= 2 ? monthlyAmount : (i === 3 ? 5000 - 2 * monthlyAmount : 0), // Distribute 5000
                status: i <= 2 ? "PAID" : (i === 3 ? "PARTIAL" : "PENDING")
            });
        }

        const newAdmission = new BoardCourseAdmission({
            studentId: newStudent._id,
            boardId: board ? board._id : new mongoose.Types.ObjectId(),
            admissionNumber: "PATH24005277",
            boardCourseName: "FOUNDATION CLASS IX Online 2026-2027",
            academicSession: "2026-2027",
            totalDurationMonths: 12,
            admissionFee: 0,
            examFee: 0,
            totalExpectedAmount: 17700,
            totalPaidAmount: 5000,
            billingStartDate: new Date(2026, 3, 1),
            centre: "GENERAL",
            installments: installments
        });

        await newAdmission.save();
        console.log("Admission Created:", newAdmission.admissionNumber);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
