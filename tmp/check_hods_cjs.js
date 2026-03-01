const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    role: String,
    isDeptHod: Boolean,
    isBoardHod: Boolean,
    isSubjectHod: Boolean
}, { strict: false });

const employeeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String
}, { strict: false });

const User = mongoose.model('User', userSchema);
const Employee = mongoose.model('Employee', employeeSchema);

const MONGO_URL = 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';

async function run() {
    await mongoose.connect(MONGO_URL);
    const hodQuery = {
        $or: [
            { role: 'HOD' },
            { isDeptHod: true },
            { isBoardHod: true },
            { isSubjectHod: true }
        ]
    };
    const users = await User.find(hodQuery);
    console.log(`Total HOD Users: ${users.length}`);

    const emps = await Employee.find({ user: { $in: users.map(u => u._id) } });
    console.log(`HODs with Employee records: ${emps.length}`);

    users.forEach(u => {
        const hasEmp = emps.find(e => e.user.toString() === u._id.toString());
        console.log(`- ${u.name} (${u.role}): ${hasEmp ? 'YES' : 'NO'}`);
    });
    process.exit(0);
}

run();
