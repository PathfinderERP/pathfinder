import connectDB from '../db/connect.js';
import RedFlag from '../models/RedFlag.js';
import User from '../models/User.js';

async function main() {
    await connectDB();
    
    const startDate = '2026-05-12';
    const endDate = '2026-05-12';
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const users = await User.find({ isActive: true }).lean();
    console.log('Total Active Users:', users.length);

    const persistentFlags = await RedFlag.find({ createdAt: { $gte: start, $lte: end } }).lean();
    console.log('Persistent Flags:', persistentFlags.length);

    if (persistentFlags.length > 0) {
        const flagUserIds = persistentFlags.map(f => f.user ? f.user.toString() : null).filter(Boolean);
        const activeUserIds = new Set(users.map(u => u._id.toString()));

        let matched = 0;
        let unmatched = 0;
        const unmatchedRoles = new Set();
        
        for (const f of persistentFlags) {
            if (!f.user) {
                unmatched++;
                continue;
            }
            if (activeUserIds.has(f.user.toString())) {
                matched++;
            } else {
                unmatched++;
                // Find if the user exists but isActive is false
                const dbUser = await User.findById(f.user);
                if (dbUser) {
                    unmatchedRoles.add(`${dbUser.role} (isActive: ${dbUser.isActive})`);
                } else {
                    unmatchedRoles.add('User not found in DB');
                }
            }
        }

        console.log(`Matched with active users: ${matched}`);
        console.log(`Unmatched: ${unmatched}`);
        console.log(`Unmatched User Roles/Status examples:`, Array.from(unmatchedRoles).slice(0, 5));
    }
    
    process.exit(0);
}

main();
