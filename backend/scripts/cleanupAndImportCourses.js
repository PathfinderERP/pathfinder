import mongoose from "mongoose";
import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Course from "../models/Master_data/Courses.js";
import ExamTag from "../models/Master_data/ExamTag.js";
import Department from "../models/Master_data/Department.js";
import Class from "../models/Master_data/Class.js";

async function cleanupAndImport() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        // 1. Clear existing courses (user request)
        console.log("Cleaning up existing courses...");
        await Course.deleteMany({});
        console.log("Cleanup complete.");

        // 2. Load Master Data for resolution
        const [tags, depts, classes] = await Promise.all([
            ExamTag.find({}),
            Department.find({}),
            Class.find({})
        ]);

        const findTag = (name) => tags.find(t => t.name.trim().toLowerCase() === name?.toString().trim().toLowerCase());
        const findDept = (name) => depts.find(d => d.departmentName.trim().toLowerCase() === name?.toString().trim().toLowerCase());
        const findClass = (name) => classes.find(c => c.name.toString().trim().toLowerCase() === name?.toString().trim().toLowerCase());

        // 3. Read Excel
        const excelPath = path.resolve(__dirname, "../../uploads/courses_2026-01-22.xlsx");
        console.log(`Reading Excel: ${excelPath}`);
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`Found ${rows.length} rows in Excel.`);

        const coursesToInsert = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const courseName = row["Course Name"];
                const deptName = row["Department"];
                const tagName = row["Exam Tag"];
                const className = row["Class"];

                if (!courseName) continue;

                const dept = findDept(deptName);
                const tag = findTag(tagName);
                const cls = findClass(className);

                if (!dept) throw new Error(`Department "${deptName}" not found in Master Data`);
                if (!tag) throw new Error(`Exam Tag "${tagName}" not found in Master Data`);
                // Class can be optional for some courses but usually required in schema. 
                // In Master_data/Courses.js, class is NOT specifically marked required, but let's be careful.

                const feesStructure = [];
                for (let f = 1; f <= 3; f++) {
                    if (row[`Fee Type ${f}`]) {
                        feesStructure.push({
                            feesType: row[`Fee Type ${f}`],
                            value: Number(row[`Fee Value ${f}`] || 0),
                            discount: String(row[`Fee Discount ${f}`] || "0")
                        });
                    }
                }

                coursesToInsert.push({
                    courseName,
                    examTag: tag._id,
                    courseDuration: row["Duration (Months)"]?.toString() || "0",
                    coursePeriod: row["Period"] || "Yearly", // Needs normalization if Excel has "yearly"
                    class: cls ? cls._id : null,
                    department: dept._id,
                    courseSession: row["Session"]?.toString() || "",
                    feesStructure,
                    mode: row["Mode"]?.toString().toUpperCase() || "OFFLINE",
                    courseType: row["Course Type"]?.toString().toUpperCase() || "INSTATION",
                    programme: row["Programme"]?.toString().toUpperCase() || "CRP"
                });

            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        if (errors.length > 0) {
            console.error("\nResolution Errors:");
            errors.forEach(e => console.error(e));
        }

        if (coursesToInsert.length > 0) {
            console.log(`\nInserting ${coursesToInsert.length} courses...`);
            const results = await Course.insertMany(coursesToInsert, { ordered: false });
            console.log(`Successfully imported ${results.length} courses.`);
        } else {
            console.log("No courses to insert.");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Fatal Error:", err);
        process.exit(1);
    }
}

cleanupAndImport();
