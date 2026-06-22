import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import Course from "../models/Master_data/Courses.js";
import Class from "../models/Master_data/Class.js";
import ExamTag from "../models/Master_data/ExamTag.js";
import Department from "../models/Master_data/Department.js";
import Boards from "../models/Master_data/Boards.js";

dotenv.config();

async function inspectAdmissions() {
    try {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder");
        console.log("Connected to MongoDB");

        const studentId = "6985e309ee4b769a5405516f";

        const normalAdms = await Admission.find({ student: studentId })
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('board')
            .lean();
        console.log("================ NORMAL ADMISSIONS ================");
        console.log(JSON.stringify(normalAdms, null, 2));

        const boardAdms = await BoardCourseAdmission.find({ studentId: studentId })
            .populate('boardId')
            .lean();
        console.log("================ BOARD ADMISSIONS ================");
        console.log(JSON.stringify(boardAdms, null, 2));

    } catch (error) {
        console.error("Error inspecting:", error);
    } finally {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder");
        await mongoose.disconnect();
    }
}

inspectAdmissions();
