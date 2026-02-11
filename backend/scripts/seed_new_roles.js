import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const usersToSeed = [
    {
        name: "Marketing Executive",
        email: "marketing@pathfinder.com",
        employeeId: "EMPMKT001",
        mobNum: "9876543210",
        password: "marketingpassword",
        role: "marketing",
        granularPermissions: {
            employeeCenter: {
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
            },
            leadManagement: {
                leads: { create: true, edit: true, delete: true },
                dashboard: { view: true }
            },
            marketingCRM: {
                campaigns: { create: true, edit: true, delete: true },
                leads: { create: true, edit: true, delete: true },
                communications: { create: true, edit: true, delete: true }
            }
        }
    },
    {
        name: "Admission Counsellor",
        email: "counsellor@pathfinder.com",
        employeeId: "EMPCON001",
        mobNum: "9876543211",
        password: "counsellorpassword",
        role: "counsellor",
        granularPermissions: {
            employeeCenter: {
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
            },
            leadManagement: {
                leads: { create: true, edit: true, delete: true },
                dashboard: { view: true }
            }
        }
    }
];

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp');
        console.log('Connected to MongoDB');

        for (const userData of usersToSeed) {
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                console.log(`User ${userData.email} already exists, skipping...`);
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(userData.password, salt);

            const newUser = new User(userData);
            await newUser.save();
            console.log(`Created user: ${userData.name} (${userData.role})`);
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
