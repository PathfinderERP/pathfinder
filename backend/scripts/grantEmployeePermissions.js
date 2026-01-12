import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const grantPermissions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅ Connected to MongoDB.");

        const employeeCenterPermissions = {
            holidayList: { create: true, edit: true, delete: true },
            holidayCalendar: { create: true, edit: true, delete: true },
            markAttendance: { create: true, edit: true, delete: true },
            leaveManagement: { create: true, edit: true, delete: true },
            regularization: { create: true, edit: true, delete: true },
            profile: { create: true, edit: true, delete: true },
            documents: { create: true, edit: true, delete: true },
            training: { create: true, edit: true, delete: true },
            feedback: { create: true, edit: true, delete: true },
            posh: { create: true, edit: true, delete: true },
            reimbursement: { create: true, edit: true, delete: true },
            resign: { create: true, edit: true, delete: true }
        };

        // Find all users who are employees (have an employeeId)
        // We only want to update non-superAdmins (superAdmins already have all access)
        const users = await User.find({ role: { $ne: 'superAdmin' } });

        console.log(`Updating ${users.length} users with Employee Center permissions...`);

        for (const user of users) {
            const updatedPermissions = user.granularPermissions || {};
            updatedPermissions.employeeCenter = employeeCenterPermissions;

            await User.updateOne(
                { _id: user._id },
                { $set: { granularPermissions: updatedPermissions } }
            );
        }

        console.log("✅ Successfully updated permissions for all employees.");
        mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

grantPermissions();
