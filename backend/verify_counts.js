import mongoose from 'mongoose';
import User from './models/User.js';
import Employee from './models/HR/Employee.js';

const MONGO_URL = 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';

async function verify() {
    await mongoose.connect(MONGO_URL);

    // HOD Logic
    const hodFilter = {
        $or: [
            { role: 'HOD' },
            { isDeptHod: true },
            { isBoardHod: true },
            { isSubjectHod: true }
        ]
    };
    const hodUsers = await User.find(hodFilter).select('_id');
    const hodEmps = await Employee.find({ user: { $in: hodUsers.map(u => u._id) } });
    console.log(`HOD Tab Count: ${hodEmps.length} (Expected matching Academics list)`);

    // Teacher Logic
    const teacherFilter = {
        role: 'teacher',
        isDeptHod: { $ne: true },
        isBoardHod: { $ne: true },
        isSubjectHod: { $ne: true }
    };
    const teacherUsers = await User.find(teacherFilter).select('_id');
    const teacherEmps = await Employee.find({ user: { $in: teacherUsers.map(u => u._id) } });
    console.log(`Teacher Tab Count: ${teacherEmps.length}`);

    process.exit(0);
}
verify();
