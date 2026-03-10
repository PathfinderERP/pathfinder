
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Employee from './models/HR/Employee.js';

dotenv.config();

async function auditDeletedUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const db = mongoose.connection;

        // 1. Get all current user IDs and Employee IDs
        const currentUsers = await User.find({}, '_id employeeId name role email').lean();
        const currentUserIds = new Set(currentUsers.map(u => u._id.toString()));
        const currentEmployeeIds = new Set(currentUsers.map(u => u.employeeId));

        console.log(`Current Users: ${currentUsers.length}`);

        // 2. Scan LeadManagement for creators who don't exist
        console.log('\n--- Auditing LeadManagement Creators ---');
        const leads = await db.collection("leadmanagements").find({}, { projection: { createdBy: 1, name: 1, email: 1 } }).toArray();
        
        const orphanedCreatorIds = new Set();
        leads.forEach(lead => {
            if (lead.createdBy && !currentUserIds.has(lead.createdBy.toString())) {
                orphanedCreatorIds.add(lead.createdBy.toString());
            }
        });

        if (orphanedCreatorIds.size > 0) {
            console.log(`Found ${orphanedCreatorIds.size} orphaned creator IDs in leads:`);
            orphanedCreatorIds.forEach(id => console.log(`  - ${id}`));
        } else {
            console.log('No orphaned creator IDs found in leads.');
        }

        // 3. Scan Follow-ups for updaters (Strings)
        console.log('\n--- Auditing Follow-up Updaters ---');
        const followUpsData = await db.collection("leadmanagements").find({ "followUps.0": { $exists: true } }, { projection: { followUps: 1 } }).toArray();
        
        const orphanedUpdaters = new Set();
        followUpsData.forEach(l => {
            l.followUps.forEach(f => {
                if (f.updatedBy && !currentEmployeeIds.has(f.updatedBy) && !currentUserIds.has(f.updatedBy)) {
                    orphanedUpdaters.add(f.updatedBy);
                }
            });
        });

        if (orphanedUpdaters.size > 0) {
            console.log(`Found ${orphanedUpdaters.size} orphaned updaters in follow-ups:`);
            orphanedUpdaters.forEach(u => console.log(`  - ${u}`));
        } else {
            console.log('No orphaned updaters found in follow-ups.');
        }

        // 4. Check for Employees without Users
        console.log('\n--- Checking Employees without Users ---');
        const employees = await Employee.find({}, 'user name employeeId').lean();
        const orphanedEmployees = employees.filter(e => !e.user || !currentUserIds.has(e.user.toString()));
        
        if (orphanedEmployees.length > 0) {
            console.log(`Found ${orphanedEmployees.length} orphaned employees (no linked user):`);
            orphanedEmployees.forEach(e => console.log(`  - ${e.name} (${e.employeeId}) | User Ref: ${e.user}`));
        } else {
            console.log('No orphaned employees found.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

auditDeletedUsers();
