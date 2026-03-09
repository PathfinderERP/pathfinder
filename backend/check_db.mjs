import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function checkCollections() {
    try {
        await mongoose.connect(mongoUrl);
        const admin = mongoose.connection.db.admin();
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections in database:");
        collections.forEach(c => console.log(` - ${c.name}`));

        // Try to find THAT SPECIFIC lead the user provided
        // _id: 69a58e2e5db690217783018d
        const Lead = mongoose.model("Lead", new mongoose.Schema({}, { strict: false }), "leads");
        const specificLead = await Lead.findById("69a58e2e5db690217783018d");
        if (specificLead) {
            console.log("Found the specific lead provided by user!");
            console.log("Full lead data:", JSON.stringify(specificLead, null, 2));
        } else {
            console.log("Specific lead 69a58e2e5db690217783018d not found in 'leads' collection.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

checkCollections();
