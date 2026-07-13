import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder";

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const Employee = mongoose.model("Employee", new mongoose.Schema({}, { strict: false }), "employees");
    const LeadManagement = mongoose.model("LeadManagement", new mongoose.Schema({}, { strict: false }), "leadmanagements");

    // 1. Find User by name
    const users = await User.find({ name: /Keya/i }).lean();
    console.log("Users matching 'Keya':", users);

    // 2. Find Employee by name or user id
    if (users.length > 0) {
        for (const u of users) {
            const employees = await Employee.find({ user: u._id }).lean();
            console.log(`Employees for user ${u.name}:`, employees);
        }
    }

    // 3. Find follow-ups on 12-07-2026 (Yesterday)
    // Yesterday IST is 2026-07-12
    // Start/End in UTC:
    const start = new Date(Date.UTC(2026, 6, 12, 0, 0, 0, 0) - (5.5 * 3600 * 1000));
    const end = new Date(Date.UTC(2026, 6, 12, 23, 59, 59, 999) - (5.5 * 3600 * 1000));

    console.log("Date range:", start.toISOString(), "to", end.toISOString());

    const bagnanId = new mongoose.Types.ObjectId('697088baabb4820c05aecdc0');
    const activeUsers = await User.find({
        isActive: true,
        centres: { $in: [bagnanId] },
        role: { $ne: 'teacher' }
    }).select('name role centres isActive').lean();

    console.log("Active users of Bagnan:", activeUsers);

    // Fetch follow ups scheduled for 2026-07-12
    const start2 = new Date(Date.UTC(2026, 6, 12, 0, 0, 0, 0) - (5.5 * 3600 * 1000));
    const end2 = new Date(Date.UTC(2026, 6, 12, 23, 59, 59, 999) - (5.5 * 3600 * 1000));

    const todaysFollowUps = await LeadManagement.aggregate([
        {
            $match: {
                centre: bagnanId,
                nextFollowUpDate: { $gte: start2, $lte: end2 },
                leadResponsibility: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: {
                    centre: "$centre",
                    userName: { $toLower: "$leadResponsibility" }
                },
                count: { $sum: 1 }
            }
        }
    ]);
    console.log("Bagnan scheduled follow-ups for yesterday:", todaysFollowUps);
    await mongoose.disconnect();
}

run().catch(console.error);
