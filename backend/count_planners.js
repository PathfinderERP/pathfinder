import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW";

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");
        const count = await mongoose.connection.db.collection("marketingplanners").countDocuments();
        console.log("TOTAL DOCUMENTS IN marketingplanners COLLECTION:", count);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
