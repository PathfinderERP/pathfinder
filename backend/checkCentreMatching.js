import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "./models/Admission/Admission.js";
import CentreSchema from "./models/Master_data/Centre.js";
import connectDB from "./db/connect.js";

dotenv.config();

const checkCentreMatching = async () => {
    try {
        await connectDB();

        // Get all unique centre names from admissions
        const admissions = await Admission.find({}).select('centre');
        const centreNamesInAdmissions = [...new Set(admissions.map(a => a.centre))];

        console.log("\n📋 Centre names in Admissions:");
        centreNamesInAdmissions.forEach(name => console.log(`  - ${name}`));

        // Get all centre names from centres collection
        const centres = await CentreSchema.find({}).select('centreName');
        const centreNamesInDB = centres.map(c => c.centreName);

        console.log("\n🏢 Centre names in Database:");
        centreNamesInDB.forEach(name => console.log(`  - ${name}`));

        // Find mismatches
        console.log("\n⚠️  Centres in Admissions but NOT in Database:");
        const mismatches = centreNamesInAdmissions.filter(name => !centreNamesInDB.includes(name));
        if (mismatches.length === 0) {
            console.log("  ✅ All centres match!");
        } else {
            mismatches.forEach(name => console.log(`  ❌ ${name}`));
        }

        process.exit();
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

checkCentreMatching();
