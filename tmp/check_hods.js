import mongoose from 'mongoose';
import User from '../backend/models/User.js';
import Employee from '../backend/models/HR/Employee.js';

const MONGO_URL = 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';

async function checkHODs() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        const hodQuery = {
            $or: [
                { role: 'HOD' },
                { isDeptHod: true },
                { isBoardHod: true },
                { isSubjectHod: true }
            ]
        };

        const users = await User.find(hodQuery).select('_id name role isDeptHod isBoardHod isSubjectHod');
        console.log(`Found ${users.length} HOD Users in total.`);

        const employees = await Employee.find({ user: { $in: users.map(u => u._id) } }).select('user name');
        console.log(`Found ${employees.length} linked Employee records.`);

        users.forEach(u => {
            const emp = employees.find(e => e.user.toString() === u._id.toString());
            console.log(`- ${u.name} (Role: ${u.role}, HOD Flags: Dept=${u.isDeptHod}, Board=${u.isBoardHod}, Subject=${u.isSubjectHod}) -> Employee Record: ${emp ? 'YES' : 'NO'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkHODs();
