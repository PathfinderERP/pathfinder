import mongoose from "mongoose";
import dotenv from "dotenv";
import LeadManagement from "../models/LeadManagement.js";
import User from "../models/User.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const rishav = await LeadManagement.findOne({ name: "RISHAV PRADHAN" }).lean();
        console.log("Rishav:", rishav);

        // Let's test the conditions one by one on Rishav:
        console.log("\n--- Testing query parts on Rishav ---");
        
        const cond1 = { leadResponsibility: { $regex: /^Kunal Ganguly(?:\s*\(.*\))?$/i } };
        const match1 = await LeadManagement.findOne({ _id: rishav._id, ...cond1 });
        console.log("Matches leadResponsibility regex:", !!match1);

        const cond2 = { followUps: { $size: 0 } };
        const match2 = await LeadManagement.findOne({ _id: rishav._id, ...cond2 });
        console.log("Matches followUps size 0:", !!match2);

        const cond3 = { isCounseled: { $ne: true } };
        const match3 = await LeadManagement.findOne({ _id: rishav._id, ...cond3 });
        console.log("Matches isCounseled ne true:", !!match3);

        const cond4 = {
            $or: [
                { createdBy: new mongoose.Types.ObjectId("6970c41a9590082b81674bdd") },
                { leadResponsibility: { $regex: /^Kunal Ganguly(?:\s*\(.*\))?$/i } }
            ]
        };
        const match4 = await LeadManagement.findOne({ _id: rishav._id, ...cond4 });
        console.log("Matches access control orConditions:", !!match4);

        const cond5 = {
            $or: [
                { isWalkIn: true },
                { source: { $regex: /^walk[- ]?in$/i } }
            ]
        };
        const match5 = await LeadManagement.findOne({ _id: rishav._id, ...cond5 });
        console.log("Matches walk-in orConditions:", !!match5);

        // Wait! Let's check the first $or in query:
        // '{ $or: [ { leadResponsibility: { $regex: /^Kunal Ganguly.../ } } ] }'
        // Wait, did we delete it or not?
        // Ah! In check_query_mutation.js, query was:
        // {
        //   $or: [ { leadResponsibility: { $regex: /^Kunal Ganguly(?:\s*\(.*\))?$/i } } ],
        //   ...
        // }
        // Let's run this query on Rishav:
        const fullQuery = {
            _id: rishav._id,
            $or: [ { leadResponsibility: { $regex: /^Kunal Ganguly(?:\s*\(.*\))?$/i } } ],
            followUps: { $size: 0 },
            isCounseled: { $ne: true },
            $and: [
                {
                    $or: [
                        { createdBy: new mongoose.Types.ObjectId("6970c41a9590082b81674bdd") },
                        { leadResponsibility: { $regex: /^Kunal Ganguly(?:\s*\(.*\))?$/i } }
                    ]
                },
                {
                    $or: [
                        { isWalkIn: true },
                        { source: { $regex: /^walk[- ]?in$/i } }
                    ]
                }
            ]
        };
        const matchFull = await LeadManagement.findOne(fullQuery);
        console.log("Matches full query:", !!matchFull);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
