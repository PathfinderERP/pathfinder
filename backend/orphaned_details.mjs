
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/HR/Employee.js';
import User from './models/User.js';
import Designation from './models/Master_data/Designation.js';
import Department from './models/Master_data/Department.js';
import Centre from './models/Master_data/Centre.js';

dotenv.config();

async function getOrphanedDetails() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // 1. Get all current user IDs
        const users = await User.find({}, '_id name employeeId').lean();
        const currentUserIds = new Set(users.map(u => u._id.toString()));
        const currentUserNamesAndIds = new Set();
        users.forEach(u => {
            currentUserNamesAndIds.add(u.name);
            currentUserNamesAndIds.add(u.employeeId);
        });

        // 2. Find Employees without User records
        const orphanedEmployees = await Employee.find({
            $or: [
                { user: { $exists: false } },
                { user: null },
                { user: { $nin: Array.from(currentUserIds).map(id => new mongoose.Types.ObjectId(id)) } }
            ]
        }).populate("designation").populate("department").populate("primaryCentre").lean();

        console.log(`\n--- Detailed Orphaned Employee Profiles (${orphanedEmployees.length}) ---`);
        orphanedEmployees.forEach(e => {
            console.log(`\nName: ${e.name}`);
            console.log(`Employee ID: ${e.employeeId}`);
            console.log(`Email: ${e.email}`);
            console.log(`Phone: ${e.phoneNumber}`);
            console.log(`Designation: ${e.designation ? e.designation.name : 'N/A'}`);
            console.log(`Department: ${e.department ? e.department.departmentName : 'N/A'}`);
            console.log(`Status: ${e.status}`);
            console.log(`User ID Ref: ${e.user}`);
        });

        // 3. Find unique names in follow-ups that don't match current users
        console.log('\n--- Telecallers found in Lead Activity BUT NOT in Users ---');
        const db = mongoose.connection;
        const leads = await db.collection("leadmanagements").find({ "followUps.0": { $exists: true } }).toArray();
        const followUpNames = new Set();
        leads.forEach(l => l.followUps.forEach(f => { if(f.updatedBy) followUpNames.add(f.updatedBy); }));
        
        const missingFromUsers = Array.from(followUpNames).filter(name => !currentUserNamesAndIds.has(name));
        missingFromUsers.forEach(name => console.log(`  - ${name}`));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

getOrphanedDetails();
