
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Employee from './models/HR/Employee.js';
import Designation from './models/Master_data/Designation.js';

dotenv.config();

async function restoreUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // 1. Identify Orphans
        const currentUsers = await User.find({}, '_id email employeeId').lean();
        const currentUserIds = new Set(currentUsers.map(u => u._id.toString()));
        const existingEmails = new Set(currentUsers.map(u => u.email.toLowerCase()));
        const existingEmpIds = new Set(currentUsers.map(u => u.employeeId));

        const orphanedEmployees = await Employee.find({
            $or: [
                { user: { $exists: false } },
                { user: null },
                { user: { $nin: Array.from(currentUserIds).map(id => new mongoose.Types.ObjectId(id)) } }
            ]
        }).populate("designation").lean();

        console.log(`Found ${orphanedEmployees.length} orphans to examine.`);

        const salt = await bcrypt.genSalt(10);
        let restoredCount = 0;
        let skippedCount = 0;

        for (const emp of orphanedEmployees) {
            console.log(`\nProcessing: ${emp.name} (${emp.employeeId})`);
            
            // Check for existing email or employeeId
            if (emp.email && existingEmails.has(emp.email.toLowerCase())) {
                console.log(`  ⚠️  Skipping: Email ${emp.email} already exists in Users collection.`);
                skippedCount++;
                continue;
            }
            if (emp.employeeId && existingEmpIds.has(emp.employeeId)) {
                console.log(`  ⚠️  Skipping: Employee ID ${emp.employeeId} already exists in Users collection.`);
                skippedCount++;
                continue;
            }

            // Determine Role
            let role = 'admin';
            if (emp.designation) {
                const desigName = emp.designation.name.toLowerCase();
                if (desigName.includes('counsellor') || desigName.includes('counselor')) role = 'counsellor';
                else if (desigName.includes('telecaller')) role = 'telecaller';
                else if (desigName.includes('teacher') || desigName.includes('faculty')) role = 'teacher';
                else if (desigName.includes('marketing')) role = 'marketing';
                else if (desigName.includes('hr')) role = 'hr';
                else if (desigName.includes('manager')) role = 'zonalManager';
            }

            const hashedPassword = await bcrypt.hash(emp.employeeId, salt);

            // Create User
            const newUser = new User({
                name: emp.name,
                email: emp.email || `${emp.employeeId.toLowerCase()}@restore.com`,
                employeeId: emp.employeeId,
                mobNum: emp.phoneNumber || "0000000000",
                password: hashedPassword,
                role: role,
                centres: emp.primaryCentre ? [emp.primaryCentre] : [],
                isActive: true
            });

            await newUser.save();
            console.log(`  ✅ Created User account (ID: ${newUser._id}, Role: ${role})`);

            // Link Employee back to User
            await Employee.findByIdAndUpdate(emp._id, { user: newUser._id });
            console.log(`  🔗 Linked Employee to User.`);
            restoredCount++;
        }

        console.log(`\nRestoration complete. Restored: ${restoredCount}, Skipped: ${skippedCount}`);
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error during restoration:', error);
    }
}

restoreUsers();
