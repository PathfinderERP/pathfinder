import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const searchDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        for (const col of collections) {
            const collection = db.collection(col.name);
            const count = await collection.countDocuments({
                $or: [
                    { leadType: "NEGATIVE" },
                    { leadType: "Negative" },
                    { leadType: "negative" },
                    { status: "NEGATIVE" },
                    { status: "Negative" },
                    { status: "negative" },
                    { "followUps.status": "NEGATIVE" },
                    { "followUps.status": "Negative" }
                ]
            });
            if (count > 0) {
                console.log(`Found ${count} records in ${col.name}`);
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error searching database:", error);
    }
};

searchDatabase();
