import mongoose from "mongoose";
import "dotenv/config";
import Course from "../models/Master_data/Courses.js";
import ExamTag from "../models/Master_data/ExamTag.js";
import Department from "../models/Master_data/Department.js";
import Class from "../models/Master_data/Class.js";

async function checkCourses() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const courses = await Course.find({})
            .populate("department")
            .populate("class")
            .populate("examTag");

        console.log(`\nTotal Courses: ${courses.length}`);

        const jeeNeet = courses.filter(c =>
            (c.examTag?.name === "JEE" || c.examTag?.name === "NEET") ||
            (c.courseName.toLowerCase().includes("jee") || c.courseName.toLowerCase().includes("neet"))
        );

        console.log("\n--- JEE / NEET Courses ---");
        jeeNeet.forEach(c => {
            console.log(`- "${c.courseName}" | Tag: ${c.examTag?.name} | Dept: ${c.department?.departmentName} | Class: ${c.class?.name}`);
        });

        const foundation = courses.filter(c => c.examTag?.name === "FOUNDATION");
        console.log(`\nFoundation Courses: ${foundation.length}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkCourses();
