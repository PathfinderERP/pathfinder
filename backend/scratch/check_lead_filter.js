import mongoose from "mongoose";
import dotenv from "dotenv";
import LeadManagement from "../models/LeadManagement.js";
import User from "../models/User.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // Let's find Kunal Ganguly's user object to mock his logged in user
        const kunal = await User.findOne({ name: /Kunal/i });
        if (!kunal) {
            console.log("Kunal Ganguly user not found in DB");
        } else {
            console.log("Kunal User ID:", kunal._id, "Role:", kunal.role, "Centres:", kunal.centres);
        }

        // Let's run a query for Kunal Ganguly as Lead responsibility
        // How buildLeadQuery resolves Agent/Lead responsibility:
        // leadResponsibility matches the agent's name.
        const agentName = "Kunal Ganguly";
        const queryBase = {
            leadResponsibility: { $regex: new RegExp(`^${agentName}(?:\\s*\\(.*\\))?$`, "i") },
            isCounseled: { $ne: true }
        };

        const totalLeads = await LeadManagement.countDocuments(queryBase);
        console.log(`Total active leads for ${agentName}:`, totalLeads);

        // Contacted leads: followUps exists and is not size 0
        const contactedQuery = { ...queryBase, followUps: { $exists: true, $not: { $size: 0 } } };
        const contactedCount = await LeadManagement.countDocuments(contactedQuery);
        console.log(`Contacted leads for ${agentName}:`, contactedCount);

        // Remaining/uncontacted leads: followUps is size 0
        const remainingQuery = { ...queryBase, followUps: { $size: 0 } };
        const remainingCount = await LeadManagement.countDocuments(remainingQuery);
        console.log(`Remaining leads for ${agentName}:`, remainingCount);

        // Let's print a few documents matching the remainingQuery
        const remainingLeads = await LeadManagement.find(remainingQuery).limit(5).lean();
        console.log(`Sample remaining leads for ${agentName}:`, remainingLeads.map(l => ({ _id: l._id, name: l.name, followUps: l.followUps })));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
