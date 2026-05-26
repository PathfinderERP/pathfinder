import connectDB from '../db/connect.js';
import User from '../models/User.js';

async function main() {
    await connectDB();
    const roles = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    console.log('Roles:', roles);
    process.exit(0);
}

main();
