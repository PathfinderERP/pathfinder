import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Models
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import Department from "../models/Master_data/Department.js";
import Designation from "../models/Master_data/Designation.js";

const repairTeachers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // 1. Fetch all departments and designations for mapping
        const allDepts = await Department.find();
        const allDesigs = await Designation.find();

        // 2. Find all teacher employees
        const teacherEmployees = await Employee.find({
            employeeId: { $regex: /^TCH/i }
        });

        console.log(`Checking ${teacherEmployees.length} teacher records...`);

        let repairedCount = 0;

        for (const emp of teacherEmployees) {
            // Find corresponding user
            const user = await User.findById(emp.user);
            if (!user) continue;

            let updated = false;

            // Map Department
            if (user.teacherDepartment) {
                const matchedDept = allDepts.find(d =>
                    d.departmentName.toLowerCase() === user.teacherDepartment.toLowerCase()
                );
                if (matchedDept && (!emp.department || emp.department.toString() !== matchedDept._id.toString())) {
                    emp.department = matchedDept._id;
                    updated = true;
                }
            }

            // Map Designation
            if (user.designation) {
                const matchedDesig = allDesigs.find(d =>
                    d.name.toLowerCase() === user.designation.toLowerCase()
                );
                if (matchedDesig && (!emp.designation || emp.designation.toString() !== matchedDesig._id.toString())) {
                    emp.designation = matchedDesig._id;
                    updated = true;
                }
            }

            // Map Teacher Type to Employment Type
            const employmentTypeMapping = {
                'Full Time': 'Full-time',
                'Part Time': 'Part-time'
            };
            const targetType = employmentTypeMapping[user.teacherType] || user.teacherType;
            if (targetType && emp.typeOfEmployment !== targetType) {
                emp.typeOfEmployment = targetType;
                updated = true;
            }

            if (updated) {
                await emp.save();
                repairedCount++;
            }
        }

        console.log(`\nRepair complete!`);
        console.log(`- Updated ${repairedCount} employee records.`);

    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        await mongoose.disconnect();
    }
};

repairTeachers();
