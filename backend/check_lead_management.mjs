import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function checkLeadManagement() {
    try {
        await mongoose.connect(mongoUrl);
        const LeadManagement = mongoose.model("LeadManagement", new mongoose.Schema({}, { strict: false }), "leadmanagements");
        
        const name = "MADHUMITA CHAKRABORTY";
        console.log(`Searching leadmanagements for ${name}...`);

        const leadsByResponsibility = await LeadManagement.findOne({ leadResponsibility: name });
        if (leadsByResponsibility) {
            console.log("Found lead in 'leadmanagements'!");
            console.log("Data:", JSON.stringify(leadsByResponsibility, null, 2));
        } else {
            console.log("No record found in 'leadmanagements' with name 'MADHUMITA CHAKRABORTY'.");
        }

        // Try searching for the email in leadmanagements if there's any field
        const anyByEmail = await LeadManagement.findOne({ email: "madhumitac440@gmail.com" });
        if (anyByEmail) {
            console.log("Found record by email in 'leadmanagements'!");
        }

        // Search for the specific ID the user gave
        const specificId = await LeadManagement.findById("69a58e2e5db690217783018d");
        if (specificId) {
             console.log("Found the specific ID in 'leadmanagements'!");
             console.log("Data:", JSON.stringify(specificId, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

checkLeadManagement();
