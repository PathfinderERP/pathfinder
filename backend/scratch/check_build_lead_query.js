import mongoose from "mongoose";
import dotenv from "dotenv";
import { buildLeadQuery } from "../utils/leadQueryHelper.js";
import LeadManagement from "../models/LeadManagement.js";
import User from "../models/User.js";
import CentreSchema from "../models/Master_data/Centre.js";
import Class from "../models/Master_data/Class.js";
import Course from "../models/Master_data/Courses.js";
import Boards from "../models/Master_data/Boards.js";
import util from "util";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const kunal = await User.findOne({ name: "Kunal Ganguly" }).populate('centres');
        if (!kunal) {
            console.log("Kunal Ganguly user not found");
            return;
        }

        const reqUser = {
            id: kunal._id.toString(),
            role: kunal.role,
            name: kunal.name
        };

        const testConfigs = [
            {
                name: "1. No followUpStatus, All leadTypes, Filter: Agent = Kunal Ganguly",
                query: { leadResponsibility: "Kunal Ganguly" }
            },
            {
                name: "2. followUpStatus = remaining, All leadTypes, Filter: Agent = Kunal Ganguly",
                query: { leadResponsibility: "Kunal Ganguly", followUpStatus: "remaining" }
            },
            {
                name: "3. followUpStatus = remaining, leadType = HOT LEAD, Filter: Agent = Kunal Ganguly",
                query: { leadResponsibility: "Kunal Ganguly", followUpStatus: "remaining", leadType: "HOT LEAD" }
            }
        ];

        for (const config of testConfigs) {
            console.log(`\n--- Running ${config.name} ---`);
            const query = await buildLeadQuery(config.query, reqUser);
            console.log("Generated query:");
            console.dir(query, { depth: null });
            const count = await LeadManagement.countDocuments(query);
            console.log("Count of leads matching query:", count);
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
