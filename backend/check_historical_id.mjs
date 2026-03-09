import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function checkHistoricalId() {
    try {
        await mongoose.connect(mongoUrl);
        const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
        
        const historicalId = "69a16c1c3e0845ab46689640";
        console.log(`Checking if User ${historicalId} exists...`);

        const user = await User.findById(historicalId);
        if (user) {
            console.log("Found User for historical ID!");
            console.log("User Data:", JSON.stringify(user, null, 2));
        } else {
            console.log(`User ${historicalId} NOT found. If this was MADHUMITA, it confirms her deletion.`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

checkHistoricalId();
