import mongoose from 'mongoose';
import User from './models/User.js';
import Employee from './models/HR/Employee.js';

const MONGO_URL = 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';

async function check() {
    await mongoose.connect(MONGO_URL);
    const users = await User.find({
        $or: [
            { isDeptHod: true },
            { isBoardHod: true },
            { isSubjectHod: true }
        ]
    }).select('name');
    console.log('HOD Users:', users.length);
    for (const u of users) {
        const emp = await Employee.findOne({ user: u._id });
        console.log(`- ${u.name}: ${emp ? 'Emp Record Found' : 'NO Emp Record'}`);
    }
    process.exit(0);
}
check();
