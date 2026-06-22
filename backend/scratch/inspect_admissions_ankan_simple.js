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
        normalAdms.forEach(a => {
            console.log({
                _id: a._id,
                admissionNumber: a.admissionNumber,
                admissionType: a.admissionType,
                course: a.course ? { _id: a.course._id, courseName: a.course.courseName } : null,
                class: a.class ? { _id: a.class._id, className: a.class.className || a.class.name } : null,
                examTag: a.examTag ? { _id: a.examTag._id, name: a.examTag.name } : null,
                department: a.department ? { _id: a.department._id, departmentName: a.department.departmentName } : null,
                board: a.board ? { _id: a.board._id, boardName: a.board.boardName } : null,
                academicSession: a.academicSession
            });
        });

        const boardAdms = await BoardCourseAdmission.find({ studentId: studentId })
            .populate('boardId')
            .lean();
        
        console.log("================ BOARD ADMISSIONS ================");
        boardAdms.forEach(ba => {
            console.log({
                _id: ba._id,
                admissionNumber: ba.admissionNumber,
                boardId: ba.boardId ? { _id: ba.boardId._id, boardName: ba.boardId.boardName || ba.boardId.boardCourse } : null,
                boardCourseName: ba.boardCourseName,
                academicSession: ba.academicSession,
                lastClass: ba.lastClass
            });
        });

    } catch (error) {
        console.error("Error inspecting:", error);
    } finally {
        await mongoose.disconnect();
    }
}

inspectAdmissions();
