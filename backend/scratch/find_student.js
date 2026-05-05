import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Students.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import Payment from "../models/Payment/Payment.js";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const email = "ashma10mar@gmail.com";
        const student = await Student.findOne({ "studentsDetails.studentEmail": email });

        if (!student) {
            console.log("Student not found");
            process.exit(0);
        }

        console.log("Student Found:", student._id, student.studentsDetails[0].studentName);

        const admission = await BoardCourseAdmission.findOne({ studentId: student._id });
        if (!admission) {
            console.log("Admission not found");
            process.exit(0);
        }

        console.log("Admission Found:", admission._id, admission.boardCourseName, admission.billId);

        const payments = await Payment.find({ admission: admission._id });
        console.log("Payments Found:", payments.length);
        payments.forEach(p => {
            console.log(`Payment: ID=${p._id}, Amount=${p.paidAmount}, BillID=${p.billId || 'MISSING'}, Status=${p.status}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
