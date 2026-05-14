import mongoose from "mongoose";
import LeadManagement from "./models/LeadManagement.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const updateLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // Update leadType in LeadManagement collection
        const result1 = await LeadManagement.updateMany(
            { leadType: "NEGATIVE" },
            { $set: { leadType: "COLD LEAD" } }
        );
        console.log(`Updated ${result1.modifiedCount} leads from NEGATIVE to COLD LEAD`);

        // Update status in followUps array
        const result2 = await LeadManagement.updateMany(
            { "followUps.status": "NEGATIVE" },
            { $set: { "followUps.$[elem].status": "COLD LEAD" } },
            { arrayFilters: [{ "elem.status": "NEGATIVE" }] }
        );
        console.log(`Updated ${result2.modifiedCount} follow-up statuses from NEGATIVE to COLD LEAD`);

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    } catch (error) {
        console.error("Error updating leads:", error);
    }
};

updateLeads();
