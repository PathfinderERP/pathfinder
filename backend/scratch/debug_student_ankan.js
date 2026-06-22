import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Students.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";

dotenv.config();

async function debugStudent() {
    try {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder");
        console.log("Connected to MongoDB");

        const student = await Student.findOne({
            $or: [
                { "studentsDetails.studentName": /ANKAN MAITY/i },
                { "studentsDetails.studentEmail": /ANKAN MAITY/i }
            ]
        });

        if (!student) {
            console.log("Student ANKAN MAITY not found!");
            return;
        }

        console.log("================ STUDENT DETAILS ================");
        console.log(JSON.stringify(student, null, 2));

        console.log("================ NORMAL ADMISSIONS ================");
        const normalAdmissions = await Admission.find({ student: student._id })
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('board');
        console.log(JSON.stringify(normalAdmissions, null, 2));

        console.log("================ BOARD ADMISSIONS ================");
        const boardAdmissions = await BoardCourseAdmission.find({ studentId: student._id })
            .populate('boardId');
        console.log(JSON.stringify(boardAdmissions, null, 2));

    } catch (error) {
        console.error("Error debugging:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

debugStudent();
