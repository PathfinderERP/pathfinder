import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const checkLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const collectionsToCheck = ["leadmanagements", "leads"];
        
        for (const colName of collectionsToCheck) {
            const collection = db.collection(colName);
            console.log(`\nChecking collection: ${colName}`);

            const count1 = await collection.countDocuments({ leadType: "NEGATIVE" });
            console.log(` - leadType "NEGATIVE": ${count1}`);

            const count2 = await collection.countDocuments({ "followUps.status": "NEGATIVE" });
            console.log(` - followUps.status "NEGATIVE": ${count2}`);

            const count3 = await collection.countDocuments({ leadType: /negative/i });
            console.log(` - leadType /negative/i: ${count3}`);
            
            // Check if status is used instead of leadType
            const count4 = await collection.countDocuments({ status: "NEGATIVE" });
            console.log(` - status "NEGATIVE": ${count4}`);
            
            const count5 = await collection.countDocuments({ status: /negative/i });
            console.log(` - status /negative/i: ${count5}`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error checking leads:", error);
    }
};

checkLeads();
