import mongoose from "mongoose";
import dotenv from "dotenv";
import { buildLeadQuery } from "../utils/leadQueryHelper.js";
import LeadManagement from "../models/LeadManagement.js";
import User from "../models/User.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const kunal = await User.findOne({ name: "Kunal Ganguly" });
        const reqUser = {
            id: kunal._id.toString(),
            role: kunal.role,
            name: kunal.name
        };

        // Let's test the mutation issue in getLeads.js
        console.log("\n--- Testing Mutation fix in getLeads.js ---");
        
        const reqQuery = {
            leadResponsibility: "Kunal Ganguly",
            followUpStatus: "remaining"
        };

        const query = await buildLeadQuery(reqQuery, reqUser);
        console.log("Original query BEFORE walkInQuery is constructed:");
        console.dir(query, { depth: null });

        // Apply clone fix
        const walkInQuery = { ...query };
        if (query.$and) {
            walkInQuery.$and = [...query.$and];
        }
        if (query.$or) {
            walkInQuery.$or = [...query.$or];
        }

        if (walkInQuery.$or) {
            walkInQuery.$and = walkInQuery.$and || [];
            walkInQuery.$and.push({
                $or: [
                    { isWalkIn: true },
                    { source: { $regex: /^walk[- ]?in$/i } }
                ]
            });
        } else {
            walkInQuery.$or = [
                { isWalkIn: true },
                { source: { $regex: /^walk[- ]?in$/i } }
            ];
        }

        console.log("\nOriginal query AFTER walkInQuery is constructed:");
        console.dir(query, { depth: null });

        console.log("\nwalkInQuery constructed:");
        console.dir(walkInQuery, { depth: null });

        // Let's run count and find on the original query
        const count = await LeadManagement.countDocuments(query);
        console.log("\nResult count for original query:", count);
        const leads = await LeadManagement.find(query).limit(5).lean();
        console.log("Leads matched by original query:", leads.map(l => ({ _id: l._id, name: l.name, isWalkIn: l.isWalkIn, source: l.source })));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
