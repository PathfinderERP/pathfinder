import mongoose from "mongoose";
import dotenv from "dotenv";
import LeadManagement from "./models/LeadManagement.js";

dotenv.config();

async function inspect() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");

    const leads = await LeadManagement.find({}).limit(10).lean();
    console.log("Sample leads (raw):");
    leads.forEach(l => {
        console.log(`- ID: ${l._id}, Name: ${l.name}, Centre: ${typeof l.centre} (${l.centre}), Course: ${typeof l.course} (${l.course}), LeadType: ${l.leadType}`);
    });

    const hotCountAgg = await LeadManagement.aggregate([
        { $match: { isCounseled: { $ne: true }, leadType: "HOT LEAD" } },
        { $count: "count" }
    ]);
    const hotCountFind = await LeadManagement.countDocuments({ isCounseled: { $ne: true }, leadType: "HOT LEAD" });

    console.log(`\nHot Leads Count (Aggregate): ${hotCountAgg[0]?.count || 0}`);
    console.log(`Hot Leads Count (countDocuments): ${hotCountFind}`);

    process.exit(0);
}

inspect();
