import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Models
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";

const syncTeachers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // 1. Find all users with role 'teacher' and employeeId starting with 'TCH'
        const teachers = await User.find({
            role: 'teacher',
            employeeId: { $regex: /^TCH/i }
        });

        console.log(`Found ${teachers.length} teachers starting with TCH.`);

        let updatedPasswords = 0;
        let createdEmployees = 0;
        let skippedEmployees = 0;

        for (const teacher of teachers) {
            try {
                // 2. Update Password to Employee ID
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(teacher.employeeId, salt);
                teacher.password = hashedPassword;
                await teacher.save();
                updatedPasswords++;

                // 3. Create Employee record if not exists
                const existingEmployee = await Employee.findOne({ user: teacher._id });
                if (!existingEmployee) {
                    const newEmployee = new Employee({
                        user: teacher._id,
                        employeeId: teacher.employeeId,
                        name: teacher.name,
                        email: teacher.email,
                        phoneNumber: teacher.mobNum,
                        status: "Active",
                        primaryCentre: teacher.centres && teacher.centres.length > 0 ? teacher.centres[0] : undefined,
                        centres: teacher.centres || []
                    });
                    await newEmployee.save();
                    createdEmployees++;
                } else {
                    skippedEmployees++;
                }
            } catch (err) {
                console.error(`Error processing teacher ${teacher.name} (${teacher.employeeId}):`, err.message);
            }
        }

        console.log("\nSync Results:");
        console.log(`- Passwords Updated: ${updatedPasswords}`);
        console.log(`- Employee Records Created: ${createdEmployees}`);
        console.log(`- Employee Records Already Existed: ${skippedEmployees}`);

    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        await mongoose.disconnect();
    }
};

syncTeachers();
