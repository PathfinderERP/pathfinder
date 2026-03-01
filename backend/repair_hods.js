import mongoose from 'mongoose';
import User from './models/User.js';
import Employee from './models/HR/Employee.js';

const MONGO_URL = 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';

async function check() {
    await mongoose.connect(MONGO_URL);
    const users = await User.find({
        role: { $in: ['teacher', 'HOD', 'admin', 'counsellor', 'telecaller', 'marketing'] },
        isActive: true
    }).select('name role employeeId email mobNum centres subject teacherDepartment designation isDeptHod isBoardHod isSubjectHod');

    console.log(`Total Active Users: ${users.length}`);
    const missing = [];
    for (const u of users) {
        const emp = await Employee.findOne({ user: u._id });
        if (!emp) {
            missing.push(u);
        }
    }

    console.log(`Users missing Employee records: ${missing.length}`);
    missing.forEach(u => {
        const isHOD = u.role === 'HOD' || u.isDeptHod || u.isBoardHod || u.isSubjectHod;
        console.log(`- ${u.name} (Role: ${u.role}, HOD: ${isHOD})`);
    });

    if (missing.length > 0) {
        console.log('\nRepairing missing HOD/Teacher records...');
        for (const u of missing) {
            // Only auto-repair Teachers and HODs as they are the ones causing the UI discrepancy
            const isHOD = u.role === 'HOD' || u.isDeptHod || u.isBoardHod || u.isSubjectHod;
            if (u.role === 'teacher' || isHOD) {
                console.log(`Creating employee record for: ${u.name}`);
                await Employee.create({
                    user: u._id,
                    employeeId: u.employeeId,
                    name: u.name,
                    email: u.email,
                    phoneNumber: u.mobNum,
                    primaryCentre: u.centres && u.centres.length > 0 ? u.centres[0] : null,
                    centres: u.centres || [],
                    status: 'Active',
                    typeOfEmployment: u.role === 'teacher' ? 'Full Time' : 'Permanent'
                });
            }
        }
    }

    process.exit(0);
}
check();
