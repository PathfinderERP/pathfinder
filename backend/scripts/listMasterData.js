import mongoose from "mongoose";
import "dotenv/config";
import ExamTag from "../models/Master_data/ExamTag.js";
import Department from "../models/Master_data/Department.js";
import Class from "../models/Master_data/Class.js";

async function checkMasterData() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const tags = await ExamTag.find({});
        console.log("\n--- Exam Tags ---");
        tags.forEach(t => console.log(`- "${t.name}" (${t._id})`));

        const depts = await Department.find({});
        console.log("\n--- Departments ---");
        depts.forEach(d => console.log(`- "${d.departmentName}" (${d._id})`));

        const classes = await Class.find({});
        console.log("\n--- Classes ---");
        classes.forEach(c => console.log(`- "${c.name}" (${c._id})`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkMasterData();
