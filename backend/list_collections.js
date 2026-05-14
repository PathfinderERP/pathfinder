import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const listCollections = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("Collections:");
        collections.forEach(c => console.log(` - ${c.name}`));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error listing collections:", error);
    }
};

listCollections();
