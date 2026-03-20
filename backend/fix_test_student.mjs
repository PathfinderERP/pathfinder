import mongoose from 'mongoose';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Admission from './models/Admission/Admission.js';
import Student from './models/Students.js';
import Course from './models/Master_data/Courses.js';
import Departments from './models/Master_data/Department.js';
import ClassSchema from './models/Master_data/Class.js';
import ExamTag from './models/Master_data/ExamTag.js';

async function run() {
    try {
        const mongoUri = 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        // 1. Create/Update Student
        let student = await Student.findOne({ "studentsDetails.studentName": "DEVDAAN MAITY" });
        if (!student) {
            student = new Student({
                studentsDetails: [{
                    studentName: "DEVDAAN MAITY",
                    mobileNum: "8013734650",
                    whatsappNumber: "8013734650",
                    studentEmail: "chandanamaity789@gmail.com",
                    centre: "HAZRA HO",
                    programme: "CRP"
                }],
                isEnrolled: true,
                status: "Active"
            });
            await student.save();
            console.log("Student Created:", student._id);
        } else {
            student.studentsDetails[0].centre = "HAZRA HO";
            student.isEnrolled = true;
            student.status = "Active";
            await student.save();
            console.log("Student Updated:", student._id);
        }

        // Delete previous board admission
        await BoardCourseAdmission.deleteOne({ admissionNumber: "PATH24005277" });
        console.log("Deleted old board admission (if any)");

        // Ensure no duplicate normal admission
        await Admission.deleteOne({ admissionNumber: "PATH24005277" });

        // Find Academic data
        let course = await Course.findOne({ courseName: { $regex: /Foundation Class IX Online/i } });
        if (!course) course = await Course.findOne({ courseName: { $regex: /Foundation/i } });
        
        const dept = await Departments.findOne({});
        const cls = await ClassSchema.findOne({ name: { $regex: /9|IX/i } });
        const examTag = await ExamTag.findOne({});

        const newAdmission = new Admission({
            student: student._id,
            admissionType: "NORMAL",
            course: course ? course._id : new mongoose.Types.ObjectId(),
            class: cls ? cls._id : new mongoose.Types.ObjectId(),
            department: dept ? dept._id : new mongoose.Types.ObjectId(),
            examTag: examTag ? examTag._id : new mongoose.Types.ObjectId(),
            centre: "HAZRA HO",
            admissionNumber: "PATH24005277",
            academicSession: "2026-2027",
            baseFees: 15000,
            cgstAmount: 1350,
            sgstAmount: 1350,
            totalFees: 17700,
            downPayment: 5000,
            downPaymentStatus: "PAID",
            remainingAmount: 12700,
            numberOfInstallments: 0,
            installmentAmount: 0,
            totalPaidAmount: 5000,
            paymentStatus: "PARTIAL",
            admissionStatus: "ACTIVE"
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
