import mongoose from "mongoose";
import dotenv from "dotenv";
import { buildLeadQuery } from "../utils/leadQueryHelper.js";

dotenv.config();

async function testDigitalLeadQuery() {
    try {
        console.log("--- Testing Digital Role Lead Access ---");

        // 1. Mock Digital user without centres
        const digitalUserNoCentres = {
            id: new mongoose.Types.ObjectId().toString(),
            role: "digital",
            name: "Digital Team Member"
        };

        const query1 = await buildLeadQuery({}, digitalUserNoCentres);
        console.log("Query for digital user without assigned centres:");
        console.log(JSON.stringify(query1, null, 2));

        // Expected: query should only contain { isCounseled: { '$ne': true } } and NOT contain createdBy, leadResponsibility, or centre restrictions.
        const isUnrestricted1 = !query1.$and || !query1.$and.some(cond => cond.$or || cond.centre);
        console.log("Is query1 unrestricted for all leads?", isUnrestricted1);

        // 2. Mock Digital user with assigned centres
        const digitalUserWithCentres = {
            id: new mongoose.Types.ObjectId().toString(),
            role: "Digital",
            name: "Digital Team Member 2",
            centres: [new mongoose.Types.ObjectId()]
        };

        const query2 = await buildLeadQuery({}, digitalUserWithCentres);
        console.log("\nQuery for digital user with assigned centres:");
        console.log(JSON.stringify(query2, null, 2));

        const isUnrestricted2 = !query2.$and || !query2.$and.some(cond => cond.$or || cond.centre);
        console.log("Is query2 unrestricted for all leads?", isUnrestricted2);

        if (isUnrestricted1 && isUnrestricted2) {
            console.log("\nSUCCESS: Digital role users can view all leads data across the system without restriction!");
        } else {
            console.error("\nFAILURE: Digital role query is still restricted.");
        }
    } catch (err) {
        console.error("Test error:", err);
    }
}

testDigitalLeadQuery();
