import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Employee from './models/HR/Employee.js';
import CentreSchema from './models/Master_data/Centre.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // Let's simulate a SuperAdmin selecting:
        // Center: HAZRA H.O (697088baabb4820c05aecdb0)
        // Role: teacher
        const selectedCentreId = "697088baabb4820c05aecdb0";
        const selectedRole = "teacher";

        console.log(`\nSimulating filter for Centre ID: ${selectedCentreId} (HAZRA H.O) and Role: ${selectedRole}`);

        const userQuery = { isActive: true };
        const roleDBMapping = {
            admin: ["admin"],
            superadmin: ["superAdmin"],
            coordinator: ["coordinator", "Class_Coordinator"],
            accounts: ["accounts"],
            hr: ["hr"],
            digital: ["digital"],
            marketing: ["marketing"],
            telecaller: ["telecaller", "centralizedTelecaller"],
            counsellor: ["counsellor"],
            teacher: ["teacher"]
        };

        const dbRoles = roleDBMapping[selectedRole.toLowerCase()];
        userQuery.role = { $in: dbRoles };

        // Query employees matching primaryCentre
        const objectIdCentres = [new mongoose.Types.ObjectId(selectedCentreId)];
        const employees = await Employee.find({
            primaryCentre: { $in: objectIdCentres }
        }).select("user");

        const allowedUserIds = employees.map(emp => emp.user).filter(Boolean);
        console.log(`Matched Employees: ${employees.length}`);
        console.log(`Matched User IDs: ${allowedUserIds.length}`);

        userQuery._id = { $in: allowedUserIds };

        const users = await User.find(userQuery).select("name role designation");
        console.log(`Matched Users from query: ${users.length}`);
        users.forEach(u => {
            console.log(`- ${u.name} | role: ${u.role} | designation: ${u.designation}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
