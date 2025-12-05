import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "./models/Admission/Admission.js";
import connectDB from "./db/connect.js";

dotenv.config();

const updateAdmissionCentres = async () => {
    try {
        await connectDB();

        // Mapping of old centre names to new centre names
        const centreMapping = {
            "Howrah": "Howrah Maidan",
            "Asansol": "Asansol GT Road",
            "Kolkata": "Kolkata Main Campus",
            "Siliguri": "Siliguri Hill Cart Road",
            "Durgapur": "Durgapur City Centre",
            "Siliguri Sevoke Road": "Siliguri Hill Cart Road"
        };

        console.log("🔄 Updating admission centre names...\n");

        for (const [oldName, newName] of Object.entries(centreMapping)) {
            const result = await Admission.updateMany(
                { centre: oldName },
                { $set: { centre: newName } }
            );

            if (result.modifiedCount > 0) {
                console.log(`✅ Updated ${result.modifiedCount} admissions: "${oldName}" → "${newName}"`);
            }
        }

        console.log("\n✨ All admissions updated successfully!");
        process.exit();
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
};

updateAdmissionCentres();
